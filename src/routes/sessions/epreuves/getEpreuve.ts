import { Request, Response } from "express";
import { APIEpreuve } from "../../../contracts/epreuves";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { mockEpreuve } from "./getEpreuves";
import { ErreurRequeteInvalide } from "../../erreursApi";

export async function getEpreuve(req: Request): Promise<APIEpreuve> {
    /*
    const { sessionId, epreuveCode } = req.params;
    const idSession = parseInt(sessionId ?? '');
    const codeEpreuve = epreuveCode ?? '';

    const session = await sessionCache.getOrFetch(idSession);
    
    if(session === undefined) {
        throw new ErreurRequeteInvalide("Identifiant de session invalide.");
    }

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    
    if(epreuve === undefined) {
        throw new ErreurRequeteInvalide("Identifiant d'épreuve invalide.");
    }
    
    return epreuve.toJSON();
    */
    return mockEpreuve();
}
