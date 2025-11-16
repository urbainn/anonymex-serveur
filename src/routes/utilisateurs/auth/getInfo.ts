import { Request, Response } from "express";
import { APIBoolResponse } from "../../../contracts/common";
import { APIGetAuthInfo } from "../../../contracts/utilisateurs";
import { utilisateurCache } from "../../../cache/utilisateurs/UtilisateurCache";

/**
 * Renvoit les informations d'authentification.
 * Pour l'instant indique seulement si c'est la première connexion (aucun utilisateur enregistré)
 * afin de rediriger vers la création du premier utilisateur.
 * @param req 
 * @returns 
 */
export async function getInfo(req: Request): Promise<APIGetAuthInfo> {
    return {
        premiereConnexion: await utilisateurCache.isAucunUtilisateurEnregistre()
    }
}
