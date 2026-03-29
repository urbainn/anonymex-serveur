import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIBoolResponse } from "../../../../contracts/common";
import { Database } from "../../../../core/services/database/Database";
import { ErreurRequeteInvalide, ErreurServeur } from "../../../erreursApi";

export async function patchConvocationSupplementaire(sessionId: string, epreuveCode: string, codeAnonymat: string, numeroEtu: unknown | undefined): Promise<APIBoolResponse> {

    const idSession = parseInt(sessionId ?? '');
    const numeroEtudiant = parseInt(numeroEtu?.toString() ?? '');

    if (!codeAnonymat.startsWith('Z')) {
        throw new ErreurServeur("Vous ne pouvez pas modifier ce code anonymat.");
    }

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    if (isNaN(numeroEtudiant)) {
        throw new ErreurRequeteInvalide("Le numéro étudiant est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const nouvelleConvoc = epreuve.convocations.convocationsSupplementaires.get(codeAnonymat);
    if (!nouvelleConvoc) {
        throw new ErreurRequeteInvalide("La convocation demandée n'existe pas, ou est déjà assignée.");
    }

    const resultats = await Database.query<{ code: string }>
        ("SELECT c.code_anonymat as code FROM convocation c WHERE c.numero_etudiant = ? AND c.id_session = ? "
            + "AND c.code_epreuve = ?;", [numeroEtudiant, idSession, epreuveCode]);

    const ancienCode = resultats[0]?.code;

    if (ancienCode) {
        const ancienneConvocation = await epreuve.convocations.getOrFetch(ancienCode);

        if (ancienneConvocation && ancienneConvocation.noteQuart != null) {
            throw new ErreurServeur("L'étudiant possède déjà une note sur son ancienne convocation.");
        }

        await epreuve.convocations.delete(ancienCode);
    }

    nouvelleConvoc.numeroEtudiant = numeroEtudiant;
    epreuve.convocations.set(codeAnonymat, nouvelleConvoc);
    const nouvelleAssignation = await epreuve.convocations.update(codeAnonymat, { numero_etudiant: numeroEtudiant });

    return { success: nouvelleAssignation.affectedRows > 0 };
}