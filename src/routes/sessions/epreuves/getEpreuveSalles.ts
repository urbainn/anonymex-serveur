import { APISallesEpreuve } from "../../../contracts/epreuves";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getEpreuveSalles(sessionId: string, epreuveCode: string): Promise<APISallesEpreuve> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);

    if (session === undefined) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);

    if (epreuve === undefined) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const salles: APISallesEpreuve = [];

    for (const [codeSalle, nbConvocs] of epreuve.convocations.effectifsSalle.entries()) {
        salles.push({ codeSalle, convocations: nbConvocs });
    }

    return salles;
}
