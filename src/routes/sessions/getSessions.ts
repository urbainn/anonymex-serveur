import { Request, Response } from "express";
import { APIListSessions } from "../../contracts/sessions";

export async function getSessions(req: Request): Promise<APIListSessions> {
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