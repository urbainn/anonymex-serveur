import dayjs from "dayjs";
import { EpreuveData } from "../../cache/epreuves/Epreuve";
import { EtudiantData } from "../../cache/etudiants/Etudiant";
import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { Session } from "../../cache/sessions/Session";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { EpreuveStatut } from "../../contracts/epreuves";
import { ErreurLigneInvalide, ErreurXLSX } from "./ErreursXLSX";
import { logInfo } from "../../utils/logger";
import { Database } from "../services/database/Database";
import { Transaction } from "../services/database/Transaction";
import { ConvocationData } from "../../cache/convocations/Convocation";
import { salleCache } from "../../cache/salles/SalleCache";
import { Salle, SalleData } from "../../cache/salles/Salle";

const CHAMPS_INTERPRETATION = {
    // nom du champ interprété => nom de la colonne dans le XLSX
    date: "DAT_DEB_PES",
    heure: "HORAIRE",
    salle: "COD_SAL",
    codeEpreuve: "COD_EPR",
    nomEpreuve: "LIC_RES",
    prenomEtudiant: "LIB_PR1_IND",
    nomEtudiant: "LIB_NOM_PAT_IND",
    codeEtudiant: "COD_ETU"
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
export async function interpretationXLSX(data: Array<Record<string, unknown>>, session: Session, filtres?: InterpretationFiltres): Promise<boolean> {

    // TEMPORAIRE!! créer la session si non existante
    const s = await sessionCache.getOrFetch(session.id);
    if (!s) {
        await sessionCache.insert({
            id_session: session.id,
            nom: `Session ${session.id}`,
            annee: new Date().getFullYear(),
            statut: 0
        }, session);
    }

    const debut = Date.now();

    // Mettre en cache les épreuves et étudiants existants de la session
    await session.epreuves.getAll();
    await etudiantCache.getAll(); // devrait sûrement être partitionné par session.....

    // Démarrer une transaction
    const transaction = await Database.creerTransaction();

    // En cas d'erreur, rollback la transaction
    try {

        // Liste des nouveaux étudiants et épreuves à insérer
        // Est inséré en batch (optimisation) et dans le cache une fois l'interprétation terminée (évite les résidus en cas d'erreur)
        const newEtudiants: EtudiantData[] = [];
        const newEpreuves: EpreuveData[] = [];
        const newConvocations: ConvocationData[] = [];
        const newSalles: Omit<SalleData, 'id_salle'>[] = [];

        for (const [indice, row] of data.entries()) {

            const dateEpreuve = (row[CHAMPS_INTERPRETATION.date] as string).replaceAll(' ', '');
            const horaire = (row[CHAMPS_INTERPRETATION.heure] as string).replaceAll(' ', '');
            const nomSalle = row[CHAMPS_INTERPRETATION.salle] as string;
            const codeEpreuve = row[CHAMPS_INTERPRETATION.codeEpreuve] as string;
            const nomEpreuve = row[CHAMPS_INTERPRETATION.nomEpreuve] as string;
            const prenomEtudiant = row[CHAMPS_INTERPRETATION.prenomEtudiant] as string;
            const nomEtudiant = row[CHAMPS_INTERPRETATION.nomEtudiant] as string;
            const codeEtudiant = parseInt(row[CHAMPS_INTERPRETATION.codeEtudiant] as string);

            // Vérifications basiques
            if (!dateEpreuve || !horaire || !nomSalle || !codeEpreuve || !nomEpreuve || !prenomEtudiant || !nomEtudiant || !codeEtudiant) {
                throw new ErreurLigneInvalide(indice + 1, 'champ obligatoire manquant')
            }

            if (isNaN(codeEtudiant)) {
                throw new ErreurLigneInvalide(indice + 1, `code étudiant non reconnu ('${row[CHAMPS_INTERPRETATION.codeEtudiant]}')`);
            }

            if (typeof dateEpreuve !== 'string' || typeof horaire !== 'string' || typeof nomSalle !== 'string' || typeof codeEpreuve !== 'string' ||
                typeof nomEpreuve !== 'string' || typeof prenomEtudiant !== 'string' || typeof nomEtudiant !== 'string') {
                throw new ErreurLigneInvalide(indice + 1, 'un champ obligatoire est du mauvais type (texte attendu)')
            }

            const dateEnMinutes = Math.round(dayjs(`${dateEpreuve} ${horaire}`, 'YYYY-MM-DD HH:mm').valueOf() / 60000); // convertir en minutes
            if (isNaN(dateEnMinutes)) {
                throw new ErreurLigneInvalide(indice + 1, `date ou horaire invalide ('${dateEpreuve} ${horaire}')`);
            }

            // Appliquer les filtres
            if (filtres) {
                if (filtres.codeEpreuves && !filtres.codeEpreuves.includes(codeEpreuve)) continue;
                if (filtres.salles && !filtres.salles.includes(nomSalle)) continue;
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
            if (!epreuve) {
                newEpreuves.push({
                    id_session: session.id,
                    code_epreuve: codeEpreuve,
                    nom: nomEpreuve,
                    statut: EpreuveStatut.MATERIEL_NON_IMPRIME,
                    date_epreuve: dateEnMinutes,
                    duree: 0, // inconnu
                    nb_presents: null,
                });
            }

            const genAnonymatTemporaire = () => {
                const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
                let anonymat = '';
                for (let i = 0; i < 6; i++) {
                    anonymat += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
                }
                return anonymat;
            }

            const salle = await salleCache.getParNom(nomSalle);
            let idSalle = salle?.idSalle;
            if(!salle || !idSalle) {
                const salleData = {
                    numero_salle: nomSalle,
                    type_salle: 'ABC' // TODO : A modifier par la suite...
                };

                idSalle = (await salleCache.insert(salleData)).insertId;
                salleCache.set(idSalle, new Salle({...salleData, id_salle: idSalle}))
            }

            // Get ou créer la convocation
            const convocation = epreuve?.convocations.get(codeEtudiant);
            if (!convocation) {
                newConvocations.push({
                    id_session: session.id,
                    code_epreuve: codeEpreuve,
                    numero_etudiant: codeEtudiant,
                    code_anonymat: genAnonymatTemporaire(),
                    note_quart: null,
                    id_salle: idSalle,
                    rang: 67 // TODO (TEMPORAIRE !)
                })
            }
        }

        await batchInsertion<EtudiantData>(transaction, 'etudiant', newEtudiants);
        await batchInsertion<EpreuveData>(transaction, 'epreuve', newEpreuves);
        await batchInsertion<ConvocationData>(transaction, 'convocation_epreuve', newConvocations);

        // Commit la transaction
        await transaction.commit();

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
        const colonnes = Object.keys(batchElements[0]!); // construire le dico des colonnes à partir du premier élément
        const placeholders = batchElements.map(() => `(${colonnes.map(() => '?').join(', ')})`).join(', ');
        const sql = `INSERT INTO \`${nomTable}\` (${colonnes.map((col) => `\`${col}\``).join(', ')}) VALUES ${placeholders}`
            + ` ON DUPLICATE KEY UPDATE ${colonnes.map((col) => `\`${col}\` = VALUES(\`${col}\`)`).join(', ')};`;
        const valeurs: any[] = [];

        for (const element of batchElements) {
            for (const colonne of colonnes) {
                valeurs.push((element as any)[colonne]);
            }
        }

        await transaction.execute(sql, valeurs);
    }
}