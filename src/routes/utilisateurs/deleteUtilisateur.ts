import { Request, Response } from "express";
import { utilisateurCache } from "../../cache/utilisateurs/UtilisateurCache";

export async function deleteUtilisateur(req: Request): Promise<{ success: boolean }> {
    /*
    const { utilisateurId } = req.params;
    const idUtilisateur = parseInt(utilisateurId ?? '');
    
    return {
        success: utilisateurCache.delete(idUtilisateur)
    }
    */
    return { success: Math.random() < 0.5 };
}
