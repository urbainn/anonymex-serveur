import { Request, Response } from "express";
import { APINewSession, NewSessionSchema } from "../../contracts/sessions";

export async function postSession(req: Request): Promise<APINewSession> {
    /*
    const nouvelleSession = NewSessionSchema.parse(req.body);
    return nouvelleSession;
    */
    return {
        nom: "Session 1", 
        annee: 2025
    };
}