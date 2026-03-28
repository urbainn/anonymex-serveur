import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { Database } from "../../../../core/services/database/Database";
import { APIBoolResponse } from "../../../../contracts/common";

export async function postConvocationPresents(sessionId: string, epreuveCode: string, presents: string): Promise<APIBoolResponse> {

    const idSession = parseInt(sessionId ?? '');
    const nbPresents = parseInt(presents ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    if (isNaN(nbPresents) || presents === undefined) {
        throw new ErreurRequeteInvalide("Le nombre de presents est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandé n'existe pas.");
    }

    const resultats = await Database.query<{ compteur: number }>("SELECT COUNT(*) as compteur FROM convocation c WHERE c.code_epreuve = ? AND c.id_session = ? AND c.note_quart IS NOT NULL;", [idSession, epreuveCode]);

    const nbScans = resultats[0]?.compteur ?? 0;

    if(nbScans === nbPresents) {
        // TODO: Changer le status
    }
    
    const epreuve = await session.epreuves.update(epreuveCode, { nb_presents: nbPresents});

    return {success: epreuve.affectedRows > 0};
}