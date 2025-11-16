import { Request } from "express";
import { APIBoolResponse } from "../../../contracts/common";
import { CreerUtilisateurSchema } from "../../../contracts/utilisateurs";

export async function postCreerUtilisateur(req: Request): Promise<APIBoolResponse> {
    const nouvelUtilisateur = CreerUtilisateurSchema.parse(req.body);
    return { success: true };
}
