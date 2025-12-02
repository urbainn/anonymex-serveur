import { Request, Response } from "express";
import { APINewSession, NewSessionSchema } from "../../contracts/sessions";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function postSession(req: Request): Promise<APINewSession> {

    const nouvelleSession = NewSessionSchema.parse(req.body);

    const dateDuJour = new Date();
    const anneeCourante = dateDuJour.getFullYear();

    if(nouvelleSession.annee < anneeCourante) {
        throw new ErreurRequeteInvalide(`Erreur l'année ne peut pas être inférieure à ${anneeCourante}.`)
    }

    const insertionSession = {
        nom: nouvelleSession.nom,
        annee: nouvelleSession.annee
    }

    const res = await sessionCache.insert(insertionSession)

    return insertionSession;

}