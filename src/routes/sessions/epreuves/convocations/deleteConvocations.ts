import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIBoolResponse } from "../../../../contracts/common";
import { ErreurRequeteInvalide } from "../../../erreursApi";


export async function deleteConvocations(sessionId: string, epreuveCode: string, listeCodeAno: unknown | undefined): Promise<APIBoolResponse> {

    const idSession = parseInt(sessionId ?? '');

    if(listeCodeAno === undefined) {
        throw new ErreurRequeteInvalide("L'array de codes anonymats est invalide.");
    }

    if(!Array.isArray(listeCodeAno)) {
        throw new ErreurRequeteInvalide("Le paramètre doit être un array de codes anonymats")
    }

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

    let resultatSuppression = false;

    for(const codeAno in listeCodeAno) {
        const suppression = await epreuve.convocations.delete(codeAno);

        resultatSuppression = suppression.affectedRows > 0;
    }

    return { success : resultatSuppression }
}