import { Request, Response } from "express";
import { APIRole } from "../../contracts/roles";
import { roleCache } from "../../cache/roles/RoleCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function deleteRole(req: Request): Promise<{ success: boolean }> {
    /*
    const { roleId } = req.params;
    const idRole = parseInt(roleId ?? '');

    if(idRole === undefined) {
        throw new ErreurRequeteInvalide("Identifiant de rôle invalide.");
    }
    
    const suppressionRole = await roleCache.delete(idRole) 

    return { 
        success : suppressionRole.affectedRows > 0
    }
    */
    return { success: Math.random() < 0.5 };
}