import { Request, Response } from "express";

export async function deleteSession(req: Request): Promise<{ success: boolean }> {

    return { success: Math.random() < 0.5} ;
}