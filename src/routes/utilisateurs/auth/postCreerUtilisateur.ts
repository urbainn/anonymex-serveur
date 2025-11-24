import { Request } from "express";
import { APIBoolResponse } from "../../../contracts/common";
import { CreerUtilisateurSchema } from "../../../contracts/utilisateurs";
import { utilisateurCache } from "../../../cache/utilisateurs/UtilisateurCache";
import bcrypt from "bcrypt";
import { ErreurRequeteInvalide } from "../../erreursApi";
import { UtilisateurData } from "../../../cache/utilisateurs/Utilisateur";
import { Database } from "../../../core/services/Database";

export async function postCreerUtilisateur(req: Request): Promise<APIBoolResponse> {
    const nouvelUtilisateur = CreerUtilisateurSchema.parse(req.body);

    const utilisateurEmail = await Database.query<UtilisateurData>("SELECT * FROM invitation WHERE email_invite = ? LIMIT 1", [nouvelUtilisateur.email]);
    const utilisateurJeton = await Database.query<UtilisateurData>("SELECT * FROM invitation WHERE jeton = ? LIMIT 1", [nouvelUtilisateur.jetonInvitation]);

    const estPremierSetup = await utilisateurCache.isAucunUtilisateurEnregistre();
    const jetonDeSetupValide = nouvelUtilisateur.jetonInvitation === "setup";
    const autorisationSetup = estPremierSetup && jetonDeSetupValide;

    const emailEstPresent = utilisateurEmail.length > 0 && utilisateurEmail[0] !== undefined;
    const jetonEstPresent = utilisateurJeton.length > 0 && utilisateurJeton[0] !== undefined;
    const autorisationStandard = emailEstPresent && jetonEstPresent;

    if(autorisationSetup || autorisationStandard) {
        const motDePasseClair = nouvelUtilisateur.motDePasse;

        bcrypt.hash(motDePasseClair, 10, async function(err, hash) {
            if(err) {
                throw new ErreurRequeteInvalide("Erreur lors du hashage du mot de passe.", err);
            }
            try {
                const res = await utilisateurCache.insert({
                    email: nouvelUtilisateur.email,
                    mot_de_passe: hash,
                    nom: nouvelUtilisateur.nom,
                    prenom: nouvelUtilisateur.prenom,
                });
            } catch(err) {
                throw new ErreurRequeteInvalide("Erreur lors de l'insertion de l'utilisateur.");
            }
        });
        return { success: true };
    }
    return { success: false };
}
