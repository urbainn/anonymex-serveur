import { Request, Response } from "express";
import { APIIncident, APIListIncidents } from "../../../contracts/incidents";

export async function getIncident(req: Request): Promise<APIIncident> {

    return ({
        idIncident: 4,
        idSession: 1,
        titre: "Numéro d'anonymat inconnu",
        details: "Lorem ipsum...",
        resolu: Math.floor(Math.random()) < 0.5,
        codeAnonymat: "AFGH",
        noteQuart: 60,
        idUtilisateur: 3
    });
}