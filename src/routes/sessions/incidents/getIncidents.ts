import { sessionCache } from "../../../cache/sessions/SessionCache";
import { APIIncident, APIListIncidents } from "../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getIncidents(sessionId: string): Promise<APIListIncidents> {
    const idSession = parseInt(sessionId ?? '');

    if(isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if(session === undefined) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const incidentsBruts = await session.incidents.getAll();

    if(incidentsBruts === undefined) {
        throw new ErreurRequeteInvalide("Impossible de récupérer les incidents de la session demandée.");
    }

    const listeIncidents: APIIncident[] = [];
    for(const incident of incidentsBruts) {

        const incidentFormatee = incident.toJSON();

        listeIncidents.push(incidentFormatee);

    }

    return {incidents: listeIncidents};
}