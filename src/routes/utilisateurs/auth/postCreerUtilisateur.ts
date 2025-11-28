import { Request, Response } from "express";
import { CreerUtilisateurSchema } from "../../../contracts/utilisateurs";
import { utilisateurCache } from "../../../cache/utilisateurs/UtilisateurCache";
import bcrypt from "bcrypt";
import { ErreurRequeteInvalide, ErreurServeur } from "../../erreursApi";
import { UtilisateurData } from "../../../cache/utilisateurs/Utilisateur";
import { Database } from "../../../core/services/Database";
import { roleCache } from "../../../cache/roles/RoleCache";
import { Role, RolePermissions } from "../../../cache/roles/Role";
import { logInfo } from "../../../utils/logger";
import { setJetonAuthentificationCookie } from "./postLogin";

export async function postCreerUtilisateur(req: Request, res: Response): Promise<void> {
    const nouvelUtilisateur = CreerUtilisateurSchema.parse(req.body);

    const donneesInvitation = await Database.query<UtilisateurData>("SELECT * FROM invitation WHERE email_invite = ? AND jeton = ? LIMIT 1", [nouvelUtilisateur.email, nouvelUtilisateur.jetonInvitation]);

    // Première inscription (toujours autoriser)
    const estPremierSetup = await utilisateurCache.isAucunUtilisateurEnregistre();
    const jetonDeSetupValide = nouvelUtilisateur.jetonInvitation === "setup";
    const autorisationSetup = estPremierSetup && jetonDeSetupValide;

    const autorisationStandard = donneesInvitation.length > 0 && donneesInvitation[0] !== undefined;

    if (autorisationSetup || autorisationStandard) {
        const motDePasseClair = nouvelUtilisateur.motDePasse;

        // Hacher le mot de passe
        const hash = await new Promise<string>((res, rej) => {
            bcrypt.hash(motDePasseClair, 10, (err, hash) => {
                if (err) rej(err);
                else res(hash);
            });
        }).catch((err) => {
            console.error(err);
            throw new ErreurServeur("Erreur lors du hachage du mot de passe.");
        });

        // Trouver le role assigné dans l'invitation
        // A FAIRE!

        if (autorisationSetup) {
            // première inscription : assigner le rôle administrateur par défaut
            // Vérifier si le role administrateur existe
            const roleDefaut = await roleCache.getOrFetch(1);
            if (!roleDefaut) {
                // ..sinon le créer
                const roleAdmin = { nom: "Administrateur", permissions: RolePermissions.ADMINISTRATEUR };
                await roleCache.insert(roleAdmin, new Role({ id_role: 1, ...roleAdmin }));
            }
        }

        try {

            const jetonAuth = "moufettes245";
            setJetonAuthentificationCookie(res, jetonAuth);

            // Créer l'utilisateur
            const insertionUtilisateur = await utilisateurCache.insert({
                email: nouvelUtilisateur.email,
                mot_de_passe: hash,
                nom: nouvelUtilisateur.nom,
                prenom: nouvelUtilisateur.prenom,
                jeton_connexion: jetonAuth,
                id_role: 1 // Rôle administrateur par défaut
            });

            logInfo("Inscription", "Nouvel utilisateur #" + insertionUtilisateur.insertId + " créé avec l'email " + nouvelUtilisateur.email + ".");

            // Supprimer l'invitation utilisée
            if (autorisationStandard) {
                await Database.query("DELETE FROM invitation WHERE email_invite = ? AND jeton = ?", [nouvelUtilisateur.email, nouvelUtilisateur.jetonInvitation]);
            }

            res.json({ success: true });
            return;

        } catch (err) {
            console.error(err);
            throw new ErreurRequeteInvalide("Erreur lors de l'insertion de l'utilisateur.");
        }
    }

    res.json({ success: false });
}
