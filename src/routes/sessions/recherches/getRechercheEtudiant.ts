import { EpreuveData } from "../../../cache/epreuves/Epreuve";
import { APIEpreuve } from "../../../contracts/epreuves";
import { Database } from "../../../core/services/database/Database";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getRechercheEtudiant(sessionId: string, numero: string): Promise<APIEpreuve[]> {

    const idSession = parseInt(sessionId ?? '');
    const numeroEtudiant = parseInt(numero ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (isNaN(numeroEtudiant) || numero === undefined) {
        throw new ErreurRequeteInvalide("Le numéro de l'étudiant est invalide.");
    }

    const epreuves = await Database.query<EpreuveData>("SELECT DISTINCT e.* FROM epreuve e JOIN convocation c ON e.id_session = c.id_session AND e.code_epreuve = c.code_epreuve WHERE c.id_session = ? AND c.numero_etudiant = ?;", [idSession, numeroEtudiant]);

    return epreuves.map(epreuve => ({
        session: epreuve.id_session,
        code: epreuve.code_epreuve,
        nom: epreuve.nom,
        statut: epreuve.statut,
        date: epreuve.date_epreuve,
        duree: epreuve.duree,
        salles: []
    }));
}