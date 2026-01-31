import dayjs from "dayjs";
import { Epreuve } from "../../cache/epreuves/Epreuve";
import { Etudiant } from "../../cache/etudiants/Etudiant";
import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { Session } from "../../cache/sessions/Session";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { EpreuveStatut } from "../../contracts/epreuves";
import { ErreurInterpretationXLSX, ErreurLigneInvalide } from "./ErreursXLSX";
import { SheetData } from "./lectureXLSX";
import { logInfo } from "../../utils/logger";

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

    for (const [indice, row] of data.entries()) {

        const dateEpreuve = (row[CHAMPS_INTERPRETATION.date] as string).replaceAll(' ', '');
        const horaire = (row[CHAMPS_INTERPRETATION.heure] as string).replaceAll(' ', '');
        const salle = row[CHAMPS_INTERPRETATION.salle] as string;
        const codeEpreuve = row[CHAMPS_INTERPRETATION.codeEpreuve] as string;
        const nomEpreuve = row[CHAMPS_INTERPRETATION.nomEpreuve] as string;
        const prenomEtudiant = row[CHAMPS_INTERPRETATION.prenomEtudiant] as string;
        const nomEtudiant = row[CHAMPS_INTERPRETATION.nomEtudiant] as string;
        const codeEtudiant = parseInt(row[CHAMPS_INTERPRETATION.codeEtudiant] as string);

        // Vérifications basiques
        if (!dateEpreuve || !horaire || !salle || !codeEpreuve || !nomEpreuve || !prenomEtudiant || !nomEtudiant || !codeEtudiant) {
            throw new ErreurLigneInvalide(indice + 1, 'champ obligatoire manquant')
        }

        if (isNaN(codeEtudiant)) {
            throw new ErreurLigneInvalide(indice + 1, `code étudiant non reconnu ('${row[CHAMPS_INTERPRETATION.codeEtudiant]}')`);
        }

        if (typeof dateEpreuve !== 'string' || typeof horaire !== 'string' || typeof salle !== 'string' || typeof codeEpreuve !== 'string' ||
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
            if (filtres.salles && !filtres.salles.includes(salle)) continue;
            if (filtres.dateEpreuve && filtres.dateEpreuve !== dateEpreuve) continue;
        }

        // Get ou créer l'étudiant
        let etudiant = etudiantCache.get(codeEtudiant);
        if (!etudiant) {
            const etudiantData = {
                numero_etudiant: codeEtudiant,
                nom: nomEtudiant,
                prenom: prenomEtudiant
            };

            etudiant = new Etudiant(etudiantData);
            await etudiantCache.insert(etudiantData, etudiant);
        }

        // Get ou créer l'épreuve
        let epreuve = session.epreuves.get(codeEpreuve);
        if (!epreuve) {
            const epreuveData = {
                id_session: session.id,
                code_epreuve: codeEpreuve,
                nom: nomEpreuve,
                statut: EpreuveStatut.MATERIEL_NON_IMPRIME,
                date_epreuve: dateEnMinutes,
                duree: 0, // inconnu
                nb_presents: null,
            };
            epreuve = new Epreuve(epreuveData);
            await session.epreuves.insert(epreuveData, epreuve);
        }

    }

    logInfo("XLSX", `Interprétation XLSX de la session ${session.id} terminée en ${Date.now() - debut} ms.`);

    return true;
}