import { Request, Response } from "express";
import { APINewSession, NewSessionSchema } from "../../contracts/sessions";

export async function postSession(req: Request): Promise<APINewSession> {
    /*
    TODO: Faire l'insertion de la session et générer son id, etc...
    */
    return {
        nom: "Session 1", 
        annee: 2025
    };
}