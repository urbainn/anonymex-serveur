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
import { ConvocationData } from "../../cache/convocations/Convocation";
import { salleCache } from "../../cache/salles/SalleCache";
import { SalleData } from "../../cache/salles/Salle";
import { appliquerDecalage, genererCodesHamming, classerCodes } from "../../utils/codeAnonymatUtils";
import { config } from "../../config";

const CHAMPS_INTERPRETATION = {
    // nom du champ interprété => nom de la colonne dans le XLSX
    date: "DAT_DEB_PES",
    heure: "HORAIRE",
    salle: "COD_SAL",
    codeEpreuve: "COD_EPR",
    nomEpreuve: "LIC_RES",
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
    let indexCode = 0; // Indice du prochain code d'anonymat à attribuer, global pour éviter la prédictibilité
    const codes = {
        1: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 1, alphabet)),
        2: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 2, alphabet)),
        3: classerCodes(genererCodesHamming(maxCodesParEpreuve, 3, 3, alphabet)),
    }

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

            const dateEpreuve = (row[CHAMPS_INTERPRETATION.date] as string).replaceAll(' ', '');
            const horaire = (row[CHAMPS_INTERPRETATION.heure] as string).replaceAll(' ', '');
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
            if (!dateEpreuve || !horaire || !codeSalle || !codeEpreuve || !nomEpreuve || !prenomEtudiant || !nomEtudiant || !codeEtudiant
                || !libelleSalle || !codeBatiment || !libelleBatiment || numPlace === undefined || !duree || !heureFin) {
                throw new ErreurLigneInvalide(indice + 1, 'champ obligatoire manquant')
            }

            if (isNaN(codeEtudiant)) {
                throw new ErreurLigneInvalide(indice + 1, `code étudiant non reconnu ('${row[CHAMPS_INTERPRETATION.codeEtudiant]}')`);
            }

            if (typeof dateEpreuve !== 'string' || typeof horaire !== 'string' || typeof codeSalle !== 'string' || typeof codeEpreuve !== 'string' ||
                typeof nomEpreuve !== 'string' || typeof prenomEtudiant !== 'string' || typeof nomEtudiant !== 'string' || typeof libelleSalle !== 'string' ||
                typeof codeBatiment !== 'string' || typeof libelleBatiment !== 'string' || typeof duree !== 'string' || typeof heureFin !== 'string') {
                throw new ErreurLigneInvalide(indice + 1, 'un champ obligatoire est du mauvais type (texte attendu)')

            }

            const dateEnMinutes = Math.round(dayjs(`${dateEpreuve} ${horaire}`, 'YYYY-MM-DD HH:mm').valueOf() / 60000); // convertir en minutes
            if (isNaN(dateEnMinutes)) {
                throw new ErreurLigneInvalide(indice + 1, `date ou horaire invalide ('${dateEpreuve} ${horaire}')`);
            }

            const parts = duree.split('h');
            const heures = parseInt(parts[0] ?? '');
            const minutes = parseInt(parts[1] ?? '');
            if (isNaN(heures) || isNaN(minutes)) {
                throw new ErreurLigneInvalide(indice + 1, `format de durée invalide ('${duree}'; format attendu : "H:mm" ou "HH:mm")`);
            }

            const dureeEnMinutes = heures * 60 + minutes;

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
            const decalageEpreuve = epreuve ? epreuve.idDecalage : decalageGlobal++;
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
                    libelle_salle: libelleSalle,
                    code_batiment: codeBatiment,
                    libelle_batiment: libelleBatiment
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
            const nbConvocs = convocs.length;
            const decalageEpreuve = decalagesEpreuves.get(codeEpreuve);
            if (decalageEpreuve === undefined) throw new Error(`Aucun décalage trouvé pour l'épreuve ${codeEpreuve}`);

            const Q = alphabet.length;
            const decalage = [
                1 + (decalageEpreuve % (Q - 1)), // décalage 1er caractère
                1 + (Math.floor(decalageEpreuve / (Q - 1)) % (Q - 1)), // décalage 2e caractère
                1 + (Math.floor(decalageEpreuve / Math.pow(Q - 1, 2)) % (Q - 1)), // décalage 3e caractère
            ]

            // Calculer la distance de Hamming optimale à appliquer
            let distanceHamming = 1;
            if (nbConvocs < codes[3].codes.length) distanceHamming = 3;
            else if (nbConvocs < codes[2].codes.length) distanceHamming = 2;

            // Récupérer les codes disponibles
            const codesDisponibles = codes[distanceHamming as 1 | 2 | 3];
            if (codesDisponibles === undefined) throw new Error('Distance de Hamming invalide');

            // Créer les convocations (et attribuer le code d'anonymat)
            for (const convocation of convocs) {
                const codeAnonymat = codesDisponibles.codes[indexCode++ % codesDisponibles.codes.length];
                if (codeAnonymat) newConvocations.push({
                    ...convocation,
                    code_anonymat: codeAnonymat + appliquerDecalage(codeAnonymat, decalage, alphabet)
                });
            }

            // Créer les convocations sur la plage réservée
            // 5% du nombre de convocations : Minimum 5, maximum 20
            /*const nbConvocsReservees = Math.min(5, Math.max(20, Math.round(convocs.length * 0.05)));
            for (let i = 0; i++; i < nbConvocsReservees) {
                const codeAnonymat = codesDisponibles.reserve[indexCode++ % codesDisponibles.reserve.length];
                if (codeAnonymat) newConvocations.push({
                    id_session: session.id,
                    code_epreuve: codeEpreuve,
                    numero_etudiant: null,
                    note_quart: null,
                    code_salle: 
                    code_anonymat: codeAnonymat + appliquerDecalage(codeAnonymat, decalage, alphabet)
                });
            }*/

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