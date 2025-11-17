import { Request, Response } from "express";
import { APIListSessions, APISession } from "../../contracts/sessions";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getSessions(req: Request): Promise<APIListSessions> {
    /*
    const sessionsBrutes = await sessionCache.getAll();

    if(sessionsBrutes === undefined) {
        throw new ErreurRequeteInvalide("La liste des sessions n'a pas pu être renvoyée.")
    }

    const sessionsFormatees: APISession[] = [];
    let anneeSessionMax = -Infinity;
    let anneeSessionMin = Infinity;

    for(const session of sessionsBrutes) {
        sessionsFormatees.push(session.toJSON());

        if(session.annee > anneeSessionMax) anneeSessionMax = session.annee;
        if(session.annee < anneeSessionMin) anneeSessionMin = session.annee;
    }

    return {
        anneeMax: anneeSessionMax,
        anneeMin: anneeSessionMin,
        sessions: sessionsFormatees
    };
    */
    return {
        anneeMax: 2028,
        anneeMin: 2025,
        sessions: [
            {
                id: 1,
                nom: "Session 1",
                annee: 2025,
                statut: 1
            },
            {
                id: 2,
                nom: "Session 2",
                annee: 2025,
                statut: 2
            },
            {
                id: 3,
                nom: "Session 3",
                annee: 2026,
                statut: 2
            }
        ]
    };
}