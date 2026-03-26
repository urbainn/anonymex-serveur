import { APIIncident } from "../../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { sessionCache } from "../../../../cache/sessions/SessionCache";

export async function getIncident(sessionId: string, codeEpreuve: string, incidentId: string): Promise<APIIncident> {
    const idSession = parseInt(sessionId ?? '');
    const idIncident = parseInt(incidentId ?? '');

    if (isNaN(idSession) || sessionId === undefined)
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");

    if (isNaN(idIncident) || incidentId === undefined)
        throw new ErreurRequeteInvalide("L'ID d'incident n'est pas valide.");

    const session = await sessionCache.getOrFetch(idSession);

    if (session === undefined) {
        throw new ErreurRequeteInvalide("La session passée n'existe pas.");
    }

    const epreuve = session.epreuves.get(codeEpreuve);
    if (epreuve === undefined) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const incident = await epreuve.incidents.getOrFetch(idIncident);

    if (incident == undefined) {
        throw new ErreurRequeteInvalide("L'incident demandé n'existe pas.");
    }

    return incident.toJSON();
}