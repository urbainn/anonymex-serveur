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

    const donneesInvitation = await Database.query<UtilisateurData>("SELECT * FROM invitation WHERE email_invite = ? AND jeton = ? LIMIT 1", [nouvelUtilisateur.email, nouvelUtilisateur.jetonInvitation]);

    // Première inscription (toujours autoriser)
    const estPremierSetup = await utilisateurCache.isAucunUtilisateurEnregistre();
    const jetonDeSetupValide = nouvelUtilisateur.jetonInvitation === "setup";
    const autorisationSetup = estPremierSetup && jetonDeSetupValide;

    const autorisationStandard = donneesInvitation.length > 0 && donneesInvitation[0] !== undefined;

    if(autorisationSetup || autorisationStandard) {
        const motDePasseClair = nouvelUtilisateur.motDePasse;

        const hash = await new Promise<string>((res) => {
            bcrypt.hash(motDePasseClair, 10, (err, hash) => res(hash));
        });
            if(hash.length === 0) {
                throw new ErreurRequeteInvalide("Erreur lors du hashage du mot de passe.");
            }
            try {
                const res = await utilisateurCache.insert({
                    email: nouvelUtilisateur.email,
                    mot_de_passe: hash,
                    nom: nouvelUtilisateur.nom,
                    prenom: nouvelUtilisateur.prenom,
                });
                return { success: true };

            } catch(err) {
                throw new ErreurRequeteInvalide("Erreur lors de l'insertion de l'utilisateur.");
            }
    }
    return { success: false };
}
