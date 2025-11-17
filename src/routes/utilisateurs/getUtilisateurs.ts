import { Request, Response } from "express";
import { APIListUtilisateur, APIUtilisateur } from "../../contracts/utilisateurs";
import { utilisateurCache } from "../../cache/utilisateurs/UtilisateurCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getUtilisateurs(req: Request): Promise<APIListUtilisateur> {
    /*
    const utiliseursBrut = await utilisateurCache.getAll();

    if(utiliseursBrut === undefined) {
        throw new ErreurRequeteInvalide("La liste des utilisateurs n'a pas pu être renvoyées.")
    }
    
    const utilisateursFormates: APIUtilisateur[] = [];

    for(const utilisateur of utiliseursBrut) {
        utilisateursFormates.push(utilisateur.toJSON());
    }

    return { 
        utilisateurs: utilisateursFormates
    }
    */
    return {
        utilisateurs: [
            {
                id: 0,
                email: "marie.dupont@gmail.com",
                nom: "Dupont",
                prenom: "Marie",
                idRole: 1,
            },
            {
                id: 1,
                email: "pierre.martin@gmail.com",
                nom: "Martin",
                prenom: "Pierre",
                idRole: 2,
            },
            {
                id: 2,
                email: "emma.lefebvre@gmail.com",
                nom: "Lefebvre",
                prenom: "Emma",
                idRole: 1,
            },
            {
                id: 3,
                email: "lucas.moreau@gmail.com",
                nom: "Moreau",
                prenom: "Lucas",
                idRole: 0,
            },
        ]
    }
};