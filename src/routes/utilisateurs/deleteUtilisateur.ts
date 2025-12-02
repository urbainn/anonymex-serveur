import { Request, Response } from "express";
import { utilisateurCache } from "../../cache/utilisateurs/UtilisateurCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function deleteUtilisateur(req: Request): Promise<{ success: boolean }> {
    /*
    const { utilisateurId } = req.params;
    const idUtilisateur = parseInt(utilisateurId ?? '');

    if(idUtilisateur === undefined) {
        throw new ErreurRequeteInvalide("Identifiant de d'utilisateur invalide.");
    }
    
    const res = await utilisateurCache.delete(idUtilisateur)

    return {
        success: res.affectedRows > 0
    }
    */
    return { success: Math.random() < 0.5 };
}
