import { EpreuveData } from "../../../cache/epreuves/Epreuve";
import { APIEpreuve } from "../../../contracts/epreuves";
import { Database } from "../../../core/services/database/Database";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getRechercheHeure(sessionId: string, horodatage: string): Promise<APIEpreuve[]> {

    const idSession = parseInt(sessionId ?? '');
    const date = parseInt(horodatage ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (isNaN(date) || horodatage === undefined) {
        throw new ErreurRequeteInvalide("L'horodatage est invalide.");
    }

    const epreuves = await Database.query<EpreuveData>("SELECT DISTINCT e.* FROM epreuve e WHERE e.id_session = ? AND e.date_epreuve = ?;", [idSession, date]);

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