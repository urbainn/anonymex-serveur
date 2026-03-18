import { IncidentCache } from "../../../cache/incidents/IncidentCache";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { APIBoolResponse } from "../../../contracts/common";
import { APIIncident, APIListIncidents, PartielIncidentSchema } from "../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../erreursApi";
import { getIncidents } from "./getIncidents";

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

    const numExiste = true; // TODO: Réaliser la réelle logique.

    if (!numExiste) {
        // Si le numéro d'anonymat n'existe pas, alors on retourne l'échec avec la liste des incidents mise à jour.
        return {
            success: false,
            incidents: []
        };
    }
    else {
        // Si le numéro d'anonymat existe alors on supprime l'incident, et on retourne le succès avec la liste des incidents mise à jour.
        // TODO: Effectuer également les modifications sur la convocation (note/numéro d'anonymat).

        const suppressionIncident = await session.incidents.delete(idIncident);

        const incidentsBruts = await session.incidents.getAll();

        if (incidentsBruts === undefined) {
            throw new ErreurRequeteInvalide("Impossible de récupérer les incidents de la session demandée.");
        }

        const listeIncidents: APIIncident[] = [];
        for (const incident of incidentsBruts) {

            const incidentFormatee = incident.toJSON();

            listeIncidents.push(incidentFormatee);

        }

        return {
            success: suppressionIncident.affectedRows > 0,
            incidents: listeIncidents
        }
    };

}