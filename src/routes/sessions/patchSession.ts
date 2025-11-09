import { Request, Response } from "express";
import { APIUpdateSession } from "../../contracts/sessions";

export async function patchSession(req: Request): Promise<APIUpdateSession> {
    
    return {
        nom: "Session 2", 
        annee: 2026
    };
}