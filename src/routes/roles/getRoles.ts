import { Request, Response } from "express";
import { APIRole, APIListRoles } from "../../contracts/roles";
import { roleCache } from "../../cache/roles/RoleCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getRoles(req: Request): Promise<APIListRoles> {
    /*
    const rolesBruts = await roleCache.getAll();

    if(rolesBruts === undefined) {
        throw new ErreurRequeteInvalide("La liste des rôles n'a pas pu être renvoyées.")
    }

    const rolesFormatees: APIRole[] = [];
    for(const role of rolesBruts) {
        rolesFormatees.push(role.toJSON());
    }

    return { roles: rolesFormatees };
    */
    return { 
        roles : [
            {
                idRole : 1,
                nom : "Administrateur",
                permissions: 1
            },
            {
                idRole : 2,
                nom : "Scanner",
                permissions: 2
            },
            {
                idRole : 3,
                nom : "Correcteur",
                permissions: 32
            }
        ]
    }
}