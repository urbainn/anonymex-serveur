import { Request, Response } from "express";
import { APIRole } from "../../contracts/roles";
import { roleCache } from "../../cache/roles/RoleCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getRole(req: Request): Promise<APIRole> {
    /*
    const { roleId } = req.params;
    const idRole = parseInt(roleId ?? '');
    const roleBrut = await roleCache.getOrFetch(idRole);

    if(roleBrut === undefined) {
        throw new ErreurRequeteInvalide("Identifiant de rôle invalide.")
    }
    
    return roleBrut.toJSON();
    */
    return {
            idRole : 1,
            nom : "Administrateur",
            permissions: 1
        }
}