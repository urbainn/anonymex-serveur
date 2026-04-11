import { sessionCache } from "../../cache/sessions/SessionCache";
import { APIBoolResponse } from "../../contracts/common";
import { ErreurRequeteInvalide } from "../erreursApi";

/**
 * Supprime une session.
 * @route `DELETE /sessions/:id/`
 */
export async function deleteSession(sessionId: string): Promise<APIBoolResponse> {
    const idSession = parseInt(sessionId ?? '');

    if(isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'id de la session est invalide.");
    }
    
    const suppressionSession = await sessionCache.delete(idSession);

    return {
        success: suppressionSession.affectedRows > 0
    }
}