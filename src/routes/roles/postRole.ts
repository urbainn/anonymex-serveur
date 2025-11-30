import { Request, Response } from "express";
import { APIRole, APIListRoles, RoleSchema } from "../../contracts/roles";
import { roleCache } from "../../cache/roles/RoleCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function postRole(req: Request): Promise<{ success : boolean }>  {
    // TODO : Implémenter la création d'un nouveau rôle...
    
    const nouveauRole = RoleSchema.parse(req.body);
    return { success: Math.random() < 0.5 };
}