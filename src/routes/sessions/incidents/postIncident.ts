import { sessionCache } from "../../../cache/sessions/SessionCache";
import { APIIncident } from "../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function postIncident(sessionId: string, codeEpreuve: string, incidentId: string, codeAnonymat: string, noteQuart: string): Promise<{ success: boolean, incidents?: APIIncident[] }> {

    const idSession = parseInt(sessionId ?? '');
    const idIncident = parseInt(incidentId ?? '');
    const quartNote = parseInt(noteQuart ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);

    if (session === undefined) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = session.epreuves.get(codeEpreuve);

    if (epreuve === undefined) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const convocation = await epreuve.convocations.getOrFetch(codeAnonymat);

    if (convocation === undefined) {
        throw new ErreurRequeteInvalide("La convocation demandée n'existe pas.");
    }

    if (epreuve.convocations.getOrFetch(codeAnonymat) === undefined) {

        // Si le numéro d'anonymat n'existe pas, alors on retourne une liste vide (pas de nouvel incident).
        return {
            success: false,
            incidents: []
        };

    }
    else if (convocation.noteQuart === null) {

        // Si le numéro d'anonymat existe alors on supprime l'incident, et on retourne le succès avec la liste des incidents mise à jour.
        const suppressionIncident = await session.incidents.delete(idIncident);

        epreuve.convocations.update(
            codeAnonymat,
            {
                code_anonymat: codeAnonymat, 
                note_quart: quartNote
            }
        )

        return {
            success: suppressionIncident.affectedRows > 0,
            incidents: []
        }
    } else {

        // Si le numéro d'anonymat existe mais est déjà assigné alors on supprime l'incident, et on retourne le succès avec la liste des incidents mise à jour.
        const suppressionIncident = await session.incidents.delete(idIncident);

        const incidentData1 = {
                id_session: idSession,
                code_epreuve: codeEpreuve,
                titre: "Doublon",
                details: "La copie possède le même numéro d'anonymat qu'une autre.",
                code_anonymat: codeAnonymat,
                note_quart: quartNote
            }

        const incidentData2 = {
            id_session: convocation.idSession,
            code_epreuve: convocation.codeEpreuve,
            titre: "Doublon",
            details: "La copie possède le même numéro d'anonymat qu'une autre.",
            code_anonymat: convocation.codeAnonymat,
            note_quart: convocation.noteQuart
        }


        const insertionIncident1 = await session.incidents.insert(incidentData1);
        const insertionIncident2 = await session.incidents.insert(incidentData2);
        
        if(insertionIncident1.affectedRows < 0 || insertionIncident2.affectedRows < 0) {
            throw new Error("La création des nouveaux incidents a échouée.");
        }

        return {
            success: suppressionIncident.affectedRows > 0,
            incidents: []
        }
    }

};