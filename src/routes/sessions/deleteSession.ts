import { Request, Response } from "express";
import { sessionCache } from "../../cache/sessions/SessionCache";

export async function deleteSession(req: Request): Promise<{ success: boolean }> {
    /*
    const { sessionId } = req.params;
    const idSession = parseInt(sessionId ?? '');
    
    return {
        success: await sessionCache.delete(idSession);
    }
    */
    return { success: Math.random() < 0.5}
}