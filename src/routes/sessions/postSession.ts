import { Request } from "express";
import { APISession, NewSessionSchema, SessionsStatut } from "../../contracts/sessions";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";
import { Session } from "../../cache/sessions/Session";

export async function postSession(req: Request): Promise<APISession> {

    const nouvelleSession = NewSessionSchema.parse(req.body);

    const dateDuJour = new Date();
    const anneeCourante = dateDuJour.getFullYear();

    if (nouvelleSession.annee < anneeCourante) {
        throw new ErreurRequeteInvalide(`Erreur l'année ne peut pas être inférieure à ${anneeCourante}.`)
    }

    const sessionData = {
        nom: nouvelleSession.nom,
        annee: nouvelleSession.annee,
        statut: SessionsStatut.ACTIVE
    }

    const res = await sessionCache.insert(sessionData);
    const session = new Session({ ...sessionData, id_session: res.insertId });
    sessionCache.set(res.insertId, session);

    return session.toJSON();

}