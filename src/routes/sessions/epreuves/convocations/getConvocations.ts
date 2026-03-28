import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIConvocation, APIListeConvocations } from "../../../../contracts/convocations";
import { ErreurRequeteInvalide } from "../../../erreursApi";

export async function getConvocations(sessionId: string, epreuveCode: string): Promise<APIListeConvocations> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandé n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandé n'existe pas.");
    }

    const convocationsBrutes = await epreuve.convocations.getAll();

    const listeConvocations: APIConvocation[] = [];
    for (const convocation of convocationsBrutes) {

        const convocationFormatee = convocation.toJSON();
        listeConvocations.push(convocationFormatee);

    }

    return { convocations: listeConvocations };


}