import { Request } from "express";
import { utilisateurCache } from "../../../cache/utilisateurs/UtilisateurCache";
import { APIBoolResponse } from "../../../contracts/common";
import { GetInvitationSchema } from "../../../contracts/utilisateurs";

export async function getInvitation(req: Request): Promise<APIBoolResponse> {
    const infosInvitation = GetInvitationSchema.parse(req.body);

    // jeton d'invitation permettant de créer le tout premier compte administrateur
    // uniquement possible lorsque la base de données est vide
    if (infosInvitation.jetonInvitation === "setup") {
        return { success: await utilisateurCache.isAucunUtilisateurEnregistre() };
    }

    return { success: true };
}