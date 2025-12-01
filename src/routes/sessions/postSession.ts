import { Request, Response } from "express";
import { APINewSession, NewSessionSchema } from "../../contracts/sessions";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function postSession(req: Request): Promise<APINewSession> {
    /*
    const nouvelleSession = NewSessionSchema.parse(req.body);

    if(nouvelleSession.annee < 2025) {
        throw new ErreurRequeteInvalide("Erreur l'année ne peut pas être inférieure à 2025.")
    }

    const insertionSession = {
        nom: nouvelleSession.nom,
        annee: nouvelleSession.annee
    }

    const res = await sessionCache.insert(insertionSession)

    return insertionSession;
    */
    return {
        nom: "Session 1", 
        annee: 2025
    };
}