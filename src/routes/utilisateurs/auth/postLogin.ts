import { Request } from "express";
import { APIBoolResponse } from "../../../contracts/common";
import { LoginUtilisateurSchema } from "../../../contracts/utilisateurs";
import { utilisateurCache } from "../../../cache/utilisateurs/UtilisateurCache";
import { Database } from "../../../core/services/Database";
import { compare } from "bcrypt";
import { Utilisateur, UtilisateurData } from "../../../cache/utilisateurs/Utilisateur";

export async function postLogin(req: Request): Promise<APIBoolResponse> {
    const infosLogin = LoginUtilisateurSchema.parse(req.body);

    const utilisateurEmail = await Database.query<UtilisateurData>("SELECT * FROM utilisateur WHERE email = ? LIMIT 1", [infosLogin.email]);
    if (utilisateurEmail.length === 0 || utilisateurEmail[0] === undefined) {
        return { success: false };
    }

    const utilisateurBrut = utilisateurEmail[0];
    const estCorrect = await new Promise<boolean>((resolve) => {
        // Compare le mot de passe avec le hash stocké
        // si valide, résoudre la promesse avec true
        compare(infosLogin.motDePasse, utilisateurBrut.passwordHash, (err, result) => {
            if (err) {
                resolve(false);
            } else {
                resolve(result);
            }
        });
    });

    if (!estCorrect) {
        return { success: false };
    }

    // Instancier l'utilisateur et le stocker en cache
    const utilisateur = new Utilisateur(utilisateurBrut);
    utilisateurCache.set(utilisateurBrut.id, utilisateur);

    // A FAIRE (todo): jeton d'authentaification ET cookies

    return { success: true };

}
