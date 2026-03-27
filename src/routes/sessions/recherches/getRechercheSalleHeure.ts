import { EpreuveData } from "../../../cache/epreuves/Epreuve";
import { APIEpreuve } from "../../../contracts/epreuves";
import { Database } from "../../../core/services/database/Database";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getRechercheSalleHeure(sessionId: string, codeSalle: string, horodatage: string): Promise<APIEpreuve[]> {

    const idSession = parseInt(sessionId ?? '');
    const date = parseInt(horodatage ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (isNaN(date) || horodatage === undefined) {
        throw new ErreurRequeteInvalide("L'horodatage est invalide.");
    }

    const epreuves = await Database.query<EpreuveData>("SELECT DISTINCT e.* FROM epreuve e JOIN convocation c ON e.id_session = c.id_session AND e.code_epreuve = c.code_epreuve WHERE c.id_session = ? AND code_salle = ? AND date_epreuve = ?;", [idSession, codeSalle, date]);

    return epreuves.map(epreuve => ({
        session: epreuve.id_session,
        code: epreuve.code_epreuve,
        nom: epreuve.nom,
        statut: epreuve.statut,
        date: epreuve.date_epreuve,
        duree: epreuve.duree,
        salles: [codeSalle]
    }));
}