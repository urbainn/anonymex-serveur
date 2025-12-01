import { Request, Response } from "express";
import { APIRole, APIListRoles, RoleSchema } from "../../contracts/roles";
import { roleCache } from "../../cache/roles/RoleCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function postRole(req: Request): Promise<{ success : boolean }>  {
    /*
    const nouveauRole = RoleSchema.parse(req.body);
    
    const insertionrole = await roleCache.insert({
        nom: nouveauRole.nom,
        permissions: nouveauRole.permissions
    })

    return { success : insertionrole.affectedRows > 0}
    */
    return { success: Math.random() < 0.5 };
}