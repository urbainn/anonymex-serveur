import dayjs from "dayjs";
import { EpreuveData } from "../../cache/epreuves/Epreuve";
import { EtudiantData } from "../../cache/etudiants/Etudiant";
import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { Session } from "../../cache/sessions/Session";
import { EpreuveStatut } from "../../contracts/epreuves";
import { ErreurLigneInvalide, ErreurXLSX } from "./ErreursXLSX";
import { logInfo } from "../../utils/logger";
import { Database } from "../services/database/Database";
import { Transaction } from "../services/database/Transaction";
import { salleCache } from "../../cache/salles/SalleCache";
import { SalleData } from "../../cache/salles/Salle";
import { appliquerDecalage, genererCodesHamming, classerCodes, getDecalages } from "../../utils/codeAnonymatUtils";
import { config } from "../../config";
import { ConvocationData } from "../../cache/epreuves/convocations/Convocation";

const CHAMPS_INTERPRETATION = {
    // nom du champ interprété => nom de la colonne dans le XLSX
    date: "DAT_DEB_PES",
    heure: "HEURE_DEBUT",
    salle: "COD_SAL",
    codeEpreuve: "COD_EPR",
    nomEpreuve: "LIB_EPR",
    prenomEtudiant: "LIB_PR1_IND",
    nomEtudiant: "LIB_NOM_PAT_IND",
    codeEtudiant: "COD_ETU",
    libelleSalle: "LIB_SAL",
    codeBatiment: "COD_BAT",
    libelleBatiment: "LIB_BAT",
    numPlace: "NUM_PLC_AFF_PSI",
    duree: "DUREE_EXA",
    heureFin: "HEURE_FIN"
};

// Correspondance des mois en trois lettres
const MOIS = {
    "JAN": "01",
    "FEB": "02",
    "MAR": "03",
    "APR": "04",
    "MAY": "05",
    "JUN": "06",
    "JUL": "07",
    "AUG": "08",
    "SEP": "09",
    "OCT": "10",
    "NOV": "11",
    "DEC": "12",
    // Français
    "FEV": "02",
    "AVR": "04",
    "AOÛ": "08",
    "AOU": "08",
} as Record<string, string>;

const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

interface InterpretationFiltres {
    /** Liste des codes d'épreuves à interpréter. Les autres seront ignorées. */
    codeEpreuves?: string[];
    /** Liste des salles d'épreuves à interpréter. Les autres seront ignorées. */
    salles?: string[];
    /** Date d'épreuve à interpréter (format AAAA-MM-JJ). Les autres seront ignorées. */
    dateEpreuve?: string;
}

/**
 * Interepreter les données du tableur XLSX des convocations d'examens d'une session, et
 * opère les mutations nécessaires dans la base de données et les caches.
 * @param data Données lues du fichier XLSX; via lectureXLSX()
 * @param session La session d'examens concernée
 * @param filtres Filtres optionnels pour n'interpréter qu'une partie des données (filtres cumulatifs; si omis, tout est interprété).
 * @returns Vrai si succès, faux si l'interprétation a échoué.
 * @note Écrase les données existantes en cas de conflit (une convocation non incluse dans le XLSX est conservée).
 */
export async function interpretationXLSX(data: Record<string, unknown>[], session: Session, filtres?: InterpretationFiltres): Promise<boolean> {

    const debut = Date.now();

    // Mettre en cache les épreuves et étudiants existants de la session
    await session.epreuves.getAll();
    await salleCache.getAll();
    await etudiantCache.getAll(); // devrait sûrement être partitionné par session.....

    // Démarrer une transaction
    const transaction = await Database.creerTransaction();

    // Générer les codes d'anonymat avec contrainte de distance de Hamming
    // Trie aussi les codes sur la plage réservée (permet d'assigner des codes supplémentaires le jour de l'examen)
    const alphabet = config.codesAnonymat.alphabetCodeAnonymat;
    const maxCodesParEpreuve = Math.pow(alphabet.length, 3);
    let indexCode = 100; // Indice du prochain code d'anonymat à attribuer, global pour éviter la prédictibilité
    const codes = {
        1: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 1, alphabet)),
        2: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 2, alphabet)),
        3: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 3, alphabet)),
    }

    // Pour les codes supplémentaires, on utilise uniquement les codes à distance 3
    // afin de s'assurer que la création de nouveaux codes suppl. puisse se faire de façon
    // prédictible et sans problème d'augmentation de la distance (car seuil max dépassé)
    const codesReserves = codes[1].reserve;

    // En cas d'erreur, rollback la transaction
    try {

        // Liste des nouveaux étudiants et épreuves à insérer
        // Est inséré en batch (optimisation) et dans le cache une fois l'interprétation terminée (évite les résidus en cas d'erreur)
        const newEtudiants: EtudiantData[] = [];
        const newEpreuves: EpreuveData[] = [];
        const newConvocations: ConvocationData[] = [];
        const newSalles: SalleData[] = [];

        // Map des convocations par code d'épreuve, pour attribuer les codes d'anonymat après coup
        const convocationsEpreuves = new Map<string, Omit<ConvocationData, 'code_anonymat'>[]>();

        // Map du décalage appliqué à chaque code d'épreuve (pour appliquer la redondance systématique)
        const decalagesEpreuves = new Map<string, number>();
        let decalageGlobal = 0; // prochain décalage à attribuer

        for (const [indice, row] of data.entries()) {

            const dateEpreuve = (row[CHAMPS_INTERPRETATION.date] as string)?.replaceAll(' ', '');
            const horaire = (row[CHAMPS_INTERPRETATION.heure] as string)?.replaceAll(' ', '');
            const codeSalle = row[CHAMPS_INTERPRETATION.salle] as string;
            const codeEpreuve = row[CHAMPS_INTERPRETATION.codeEpreuve] as string;
            const nomEpreuve = row[CHAMPS_INTERPRETATION.nomEpreuve] as string;
            const prenomEtudiant = row[CHAMPS_INTERPRETATION.prenomEtudiant] as string;
            const nomEtudiant = row[CHAMPS_INTERPRETATION.nomEtudiant] as string;
            const codeEtudiant = parseInt(row[CHAMPS_INTERPRETATION.codeEtudiant] as string);
            const libelleSalle = row[CHAMPS_INTERPRETATION.libelleSalle] as string;
            const codeBatiment = row[CHAMPS_INTERPRETATION.codeBatiment] as string;
            const libelleBatiment = row[CHAMPS_INTERPRETATION.libelleBatiment] as string;
            const numPlace = row[CHAMPS_INTERPRETATION.numPlace] as string;
            const duree = row[CHAMPS_INTERPRETATION.duree] as string;
            const heureFin = row[CHAMPS_INTERPRETATION.heureFin] as string;

            // Vérifications basiques
            if (!dateEpreuve || !horaire || !codeSalle || !codeEpreuve || !nomEpreuve || !prenomEtudiant ||
                !nomEtudiant || !codeEtudiant || numPlace === undefined || !duree || !heureFin) {
                throw new ErreurLigneInvalide(indice + 1, 'champ obligatoire manquant')
            }

            if (isNaN(codeEtudiant)) {
                throw new ErreurLigneInvalide(indice + 1, `code étudiant non reconnu ('${row[CHAMPS_INTERPRETATION.codeEtudiant]}')`);
            }

            if (typeof dateEpreuve !== 'string' || typeof horaire !== 'string' || typeof codeSalle !== 'string' || typeof codeEpreuve !== 'string' ||
                typeof nomEpreuve !== 'string' || typeof prenomEtudiant !== 'string' || typeof nomEtudiant !== 'string' ||
                typeof duree !== 'string' || typeof heureFin !== 'string') {
                throw new ErreurLigneInvalide(indice + 1, 'un champ obligatoire est du mauvais type (texte attendu).')
            }

            // Parser l'horaire
            const composantesHoraire = horaire.split('h');
            const horaireHeures = parseInt(composantesHoraire[0] ?? '');
            const horaireMinutes = parseInt(composantesHoraire[1] ?? '');
            if (isNaN(horaireHeures) || isNaN(horaireMinutes)) {
                throw new ErreurLigneInvalide(indice + 1, `horaire invalide ('${duree}'; format attendu : "H:mm" ou "HH:mm")`);
            }
            const horaireEnMinutes = horaireHeures * 60 + horaireMinutes;

            // PARSER LA DATE
            // Faire la correspondance entre le mois en lettres et sa valeur numérique
            const composantesDateEpreuve = dateEpreuve.split('-');
            const moisInput = composantesDateEpreuve[1];
            if (composantesDateEpreuve.length < 3 || moisInput === undefined) {
                throw new ErreurLigneInvalide(indice + 1, `format de date non reconnu (attendu: "DD-MMM-YY" ou "DD-MM-YY").`);
            }

            const moisNumerique = MOIS[moisInput] ?? moisInput;
            const dateParsee = composantesDateEpreuve[0] + '-' + moisNumerique + '-' + composantesDateEpreuve[2];

            const dateEnMinutes = horaireEnMinutes + Math.round(dayjs(dateParsee, 'DD-MM-YY').valueOf() / 60000); // convertir en minutes
            if (isNaN(dateEnMinutes)) {
                throw new ErreurLigneInvalide(indice + 1, `date invalide ('${dateParsee}'; format attendu: "DD-MMM-YY" ou "DD-MM-YY").`);
            }

            // Calculer la durée
            const composantesDuree = duree.split('h');
            const dureeHeures = parseInt(composantesDuree[0] ?? '');
            const dureeMinutes = parseInt(composantesDuree[1] ?? '');
            if (isNaN(dureeHeures) || isNaN(dureeMinutes)) {
                throw new ErreurLigneInvalide(indice + 1, `format de durée invalide ('${duree}'; format attendu : "H:mm" ou "HH:mm")`);
            }
            const dureeEnMinutes = dureeHeures * 60 + dureeMinutes;

            // Appliquer les filtres
            if (filtres) {
                if (filtres.codeEpreuves && !filtres.codeEpreuves.includes(codeEpreuve)) continue;
                if (filtres.salles && !filtres.salles.includes(codeSalle)) continue;
                if (filtres.dateEpreuve && filtres.dateEpreuve !== dateEpreuve) continue;
            }

            // Get ou créer l'étudiant
            const etudiant = etudiantCache.get(codeEtudiant);
            if (!etudiant) {
                newEtudiants.push({
                    numero_etudiant: codeEtudiant,
                    nom: nomEtudiant,
                    prenom: prenomEtudiant
                });
            }

            // Get ou créer l'épreuve
            const epreuve = session.epreuves.get(codeEpreuve);
            const decalageExistant = decalagesEpreuves.get(codeEpreuve);
            const decalageEpreuve = decalageExistant ?? (epreuve ? epreuve.idDecalage : decalageGlobal++);
            if (!epreuve) {
                newEpreuves.push({
                    id_session: session.id,
                    code_epreuve: codeEpreuve,
                    nom: nomEpreuve,
                    statut: EpreuveStatut.MATERIEL_NON_IMPRIME,
                    date_epreuve: dateEnMinutes,
                    duree: dureeEnMinutes,
                    id_decalage: decalageEpreuve,
                    nb_presents: null,
                });
            }

            if (!decalagesEpreuves.has(codeEpreuve)) {
                decalagesEpreuves.set(codeEpreuve, decalageEpreuve);
            }

            // Get ou créer la salle
            const salle = salleCache.get(codeSalle);
            if (!salle) {
                const salleData = {
                    code_salle: codeSalle,
                    libelle_salle: libelleSalle ?? '',
                    code_batiment: codeBatiment ?? '',
                    libelle_batiment: libelleBatiment ?? ''
                };
                newSalles.push(salleData);
            }

            // Get ou créer la convocation
            const rang = parseInt(numPlace);
            const convocation = {
                id_session: session.id,
                code_epreuve: codeEpreuve,
                numero_etudiant: codeEtudiant,
                note_quart: null,
                code_salle: codeSalle,
                rang: rang && !isNaN(rang) ? rang : null
            };

            // Ajouter la convocation
            const convocEpreuve = convocationsEpreuves.get(codeEpreuve);
            if (convocEpreuve) convocEpreuve.push(convocation);
            else convocationsEpreuves.set(codeEpreuve, [convocation]);
        }

        // Attribuer les codes d'anonymat aux convocations, par code d'épreuve
        for (const [codeEpreuve, convocs] of convocationsEpreuves.entries()) {
            const salles = new Map<string, number>(); // code salle => nb. convocs dans cette salle
            const nbConvocs = convocs.length;
            const decalageEpreuve = decalagesEpreuves.get(codeEpreuve);

            if (decalageEpreuve === undefined) throw new Error(`Aucun décalage trouvé pour l'épreuve ${codeEpreuve}`);
            const decalages = getDecalages(decalageEpreuve, alphabet);

            // Calculer la distance de Hamming optimale à appliquer
            let distanceHamming = 1;
            if (nbConvocs < codes[3].codes.length) distanceHamming = 3;
            else if (nbConvocs < codes[2].codes.length) distanceHamming = 2;

            // Récupérer les codes disponibles
            const codesDisponibles = codes[distanceHamming as 1 | 2 | 3];
            if (codesDisponibles === undefined) throw new Error('Distance de Hamming invalide');

            // Créer les convocations (et attribuer le code d'anonymat)
            for (const convocation of convocs) {

                // Ajouter la salle à la liste
                const etudiantsSalle = salles.get(convocation.code_salle) ?? 0;
                salles.set(convocation.code_salle, etudiantsSalle + 1);

                const codeAnonymat = codesDisponibles.codes[indexCode++ % codesDisponibles.codes.length];
                if (codeAnonymat) newConvocations.push({
                    ...convocation,
                    code_anonymat: codeAnonymat + appliquerDecalage(codeAnonymat, decalages, alphabet)
                });
            }

            for (const [codeSalle, nbEtudiants] of salles) {

                // Créer les convocations sur la plage réservée
                // 5% du nombre de convocations : Minimum 4 (ou nb. etudiants si < 4), maximum 20
                const nbConvocsReservees = Math.min(20,
                    Math.max(
                        Math.min(4, nbEtudiants),
                        Math.round(nbEtudiants * 0.05)
                    )
                );

                for (let i = 0; i < nbConvocsReservees; i++) {
                    const codeAnonymat = codesReserves[indexCode++ % codesReserves.length];
                    if (codeAnonymat) newConvocations.push({
                        id_session: session.id,
                        code_epreuve: codeEpreuve,
                        numero_etudiant: null,
                        note_quart: null,
                        code_salle: codeSalle,
                        rang: null,
                        code_anonymat: codeAnonymat + appliquerDecalage(codeAnonymat, decalages, alphabet)
                    });
                }

            }

        }

        await batchInsertion<EtudiantData>(transaction, 'etudiant', newEtudiants);
        await batchInsertion<EpreuveData>(transaction, 'epreuve', newEpreuves);
        await batchInsertion<SalleData>(transaction, 'salle', newSalles);
        await batchInsertion<ConvocationData>(transaction, 'convocation', newConvocations);

        // Commit la transaction
        await transaction.commit();

        // Aucune erreur : mettre à jour les caches
        for (const etudiantData of newEtudiants) {
            etudiantCache.set(etudiantData.numero_etudiant, etudiantCache.fromDatabase(etudiantData));
        }
        for (const epreuveData of newEpreuves) {
            session.epreuves.set(epreuveData.code_epreuve, session.epreuves.fromDatabase(epreuveData));
        }
        for (const convocationData of newConvocations) {
            const epreuve = session.epreuves.get(convocationData.code_epreuve);
            if (epreuve) epreuve.convocations.set(convocationData.code_anonymat, epreuve.convocations.fromDatabase(convocationData));
        }
        for (const salleData of newSalles) {
            salleCache.set(salleData.code_salle, salleCache.fromDatabase(salleData));
        }

        // Mettre à jour les caches de chaque épreuve
        for (const epreuve of session.epreuves.values()) {
            epreuve.convocations.reconstruireCache();
        }

        logInfo("XLSX", `Interprétation XLSX de la session ${session.id} terminée en ${Date.now() - debut} ms.`);

        return true;

    } catch (error) {
        // Rollback la transaction en cas d'erreur
        await transaction.rollback();

        // faire remonter l'erreur réassignée
        throw ErreurXLSX.assigner(error);
    }
}

/**
 * Insert, via transaction, les éléments par batch de 100 dans la table donnée.
 * @template D type BRUT éléments à insérer (ex: EtudiantData, EpreuveData, etc.)
 * @param transaction 
 * @param nomTable nom de la table SQL
 * @param elements liste des éléments (sous forme brute, DATA) à insérer
 */
async function batchInsertion<D>(transaction: Transaction, nomTable: string, elements: D[]): Promise<void> {
    const BATCH_SIZE = 100;
    const nbBatches = Math.ceil(elements.length / BATCH_SIZE);

    if (elements.length === 0) {
        return;
    }

    for (let batchIndex = 0; batchIndex < nbBatches; batchIndex++) {

        // découper les [n*BATCH_SIZE .. (n+1)*BATCH_SIZE] éléments composant le batch courant
        const batchElements = elements.slice(batchIndex * BATCH_SIZE, (batchIndex + 1) * BATCH_SIZE);

        // Construire la requête d'insertion multiple
        if (!batchElements[0]) continue;
        const colonnes = Object.keys(batchElements[0]); // construire le dico des colonnes à partir du premier élément
        const placeholders = batchElements.map(() => `(${colonnes.map(() => '?').join(', ')})`).join(', ');
        const sql = `INSERT INTO \`${nomTable}\` (${colonnes.map((col) => `\`${col}\``).join(', ')}) VALUES ${placeholders}`
            + ` ON DUPLICATE KEY UPDATE ${colonnes.map((col) => `\`${col}\` = VALUES(\`${col}\`)`).join(', ')};`;
        const valeurs = [];

        for (const element of batchElements) {
            for (const colonne of colonnes) {
                valeurs.push((element)[colonne as keyof D]);
            }
        }

        await transaction.execute(sql, valeurs);
    }
}