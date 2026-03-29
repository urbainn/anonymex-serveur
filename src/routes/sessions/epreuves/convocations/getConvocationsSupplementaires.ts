import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIConvocation, APIConvocationsSupplementairesMap } from "../../../../contracts/convocations";
import { ErreurRequeteInvalide } from "../../../erreursApi";

export async function getConvocationsSupplementaires(sessionId: string, epreuveCode: string): Promise<APIConvocationsSupplementairesMap> {

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

    await epreuve.convocations.getAll();

    const convocsParSalle: Record<string, APIConvocation[]> = {};
    for (const convocation of epreuve.convocations.convocationsSupplementaires.values()) {

        const convocationFormatee = convocation.toJSON();

        if (!convocsParSalle[convocation.codeSalle]) {
            convocsParSalle[convocation.codeSalle] = [];
        }

        convocsParSalle[convocation.codeSalle]?.push(convocationFormatee);

    }

    return convocsParSalle;

}