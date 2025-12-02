import { Request, Response } from "express";
import { APIIncident, APIListIncidents } from "../../../contracts/incidents";
import { ErreurRequeteInvalide } from "../../erreursApi";
import { sessionCache } from "../../../cache/sessions/SessionCache";

export async function getIncident(req: Request): Promise<APIIncident> {
    /*
    const { sessionId,incidentId } = req.params;
    const idSession = parseInt(sessionId ?? '');
    const idIncident = parseInt(incidentId ?? '');
    
    const session = await sessionCache.getOrFetch(idSession);

    if(session === undefined) {
        throw new ErreurRequeteInvalide("Identifiant de session invalide.")
    }

    TODO: A continuer pas sur de tout...
    */
    return ({
        idIncident: 4,
        idSession: 1,
        codeEpreuve: "HAI405I",
        titre: "Numéro d'anonymat inconnu",
        details: "Lorem ipsum...",
        resolu: Math.floor(Math.random()) < 0.5,
        codeAnonymat: "AFGH",
        noteQuart: 60,
    });
}