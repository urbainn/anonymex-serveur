import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { Database } from "../../../../core/services/database/Database";
import { APIBoolResponse } from "../../../../contracts/common";

export async function postConvocationsTransfert(sessionId: string, epreuveCode: string, data: { sallesDepart?: string[], codesAnonymats?: string[], salleTransfert: string }): Promise<APIBoolResponse> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession)) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    if (!data.salleTransfert) {
        throw new ErreurRequeteInvalide("La salle de transfert est manquante.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    let validation = false;

    if (data.sallesDepart && data.sallesDepart.length > 0) {

        const listeSalles = data.sallesDepart.map(() => "?").join(",");

        const resultat = await Database.execute(`UPDATE convocation SET code_salle = ? WHERE id_session = ? AND code_epreuve = ? AND code_salle IN (${listeSalles})`, [data.salleTransfert, idSession, epreuveCode, ...data.sallesDepart]);
    
        validation = resultat.affectedRows > 0
    }

    if (data.codesAnonymats && data.codesAnonymats.length > 0) {

        const listeCodes = data.codesAnonymats.map(() => "?").join(",");

        const resultat = await Database.execute(`UPDATE convocation SET code_salle = ? WHERE id_session = ? AND code_epreuve = ? AND code_anonymat IN (${listeCodes})`, [data.salleTransfert, idSession, epreuveCode, ...data.codesAnonymats]);
    
        validation = resultat.affectedRows > 0
    }

    await epreuve.convocations.getAll();

    return { success: validation};
}