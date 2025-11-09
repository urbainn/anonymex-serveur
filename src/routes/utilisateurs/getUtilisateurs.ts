import { Request, Response } from "express";
import { APIListUtilisateur } from "../../contracts/utilisateurs";

export async function getUtilisateurs(req: Request): Promise<APIListUtilisateur> {
    
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