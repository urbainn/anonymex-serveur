import { sessionCache } from "../../../cache/sessions/SessionCache";
import { APIEpreuve } from "../../../contracts/epreuves";
import { Database } from "../../../core/services/database/Database";
import { ErreurRequeteInvalide, ErreurServeur } from "../../erreursApi";

export async function getRechercheHeure(sessionId: string, horodatage: string): Promise<APIEpreuve[]> {

    const idSession = parseInt(sessionId ?? '');
    const date = parseInt(horodatage ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (isNaN(date) || horodatage === undefined) {
        throw new ErreurRequeteInvalide("L'horodatage est invalide.");
    }

    const resultats = await Database.query<{ codeEpreuve: string }>("SELECT DISTINCT e.code_epreuve as codeEpreuve FROM epreuve e WHERE e.id_session = ? AND e.date_epreuve = ?;", [idSession, date]);
    
   const session = await sessionCache.getOrFetch(idSession);

    if (!session) {
        throw new ErreurServeur(`La session d'id : ${idSession} n'existe pas.`);
    }

    await session.epreuves.getAll();

    const epreuves: APIEpreuve[] = [];

    for (const resultat of resultats) {

        const epreuve = await session.epreuves.getOrFetch(resultat.codeEpreuve);

        if (!epreuve) {
            throw new ErreurServeur(`L'épreuve de code : ${resultat.codeEpreuve} n'existe pas.`);
        }

        epreuves.push(epreuve.toJSON());
    }

    return epreuves;
}