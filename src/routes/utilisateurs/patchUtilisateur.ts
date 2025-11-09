import { Request, Response } from "express";

export async function patchUtilisateur(req: Request): Promise<{ success: boolean }> {

    return { success: Math.random() < 0.5 };
}