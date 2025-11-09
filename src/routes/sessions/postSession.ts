import { Request, Response } from "express";
import { APINewSession } from "../../contracts/sessions";

export async function postSession(req: Request): Promise<APINewSession> {
    
    return {
        nom: "Session 1", 
        annee: 2025
    };
}