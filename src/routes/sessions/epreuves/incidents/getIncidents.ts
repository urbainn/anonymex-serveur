import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIIncident, APIListIncidents } from "../../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../../erreursApi";

export async function getIncidents(sessionId: string, codeEpreuve: string): Promise<APIListIncidents> {
    const idSession = parseInt(sessionId ?? '');

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

    const incidentsBruts = epreuve.incidents.values();

    const listeIncidents: APIIncident[] = [];
    for (const incident of incidentsBruts) {

        const incidentFormatee = incident.toJSON();
        listeIncidents.push(incidentFormatee);

    }

    return { incidents: listeIncidents };
}