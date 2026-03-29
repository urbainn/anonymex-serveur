import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { APIBoolResponse } from "../../../../contracts/common";

export async function postConvocationPresents(sessionId: string, epreuveCode: string, presents: unknown | undefined): Promise<APIBoolResponse> {

    const idSession = parseInt(sessionId ?? '');

    const nbPresents = parseInt(presents?.toString() ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    if (isNaN(nbPresents) || nbPresents < 0) {
        throw new ErreurRequeteInvalide("Le nombre de presents est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    if (epreuve.convocations.nbDepots === nbPresents) {
        // TODO: Changer le status
    }

    const update = await session.epreuves.update(epreuveCode, { nb_presents: nbPresents });

    return { success: update.affectedRows > 0 };
}
