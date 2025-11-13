import { RowDataPacket } from "mysql2";
import { ElementEnCache } from "../base/ElementEnCacheBase";
import { Role } from "../roles/Role";
import { roleCache } from "../roles/RoleCache";

export interface UtilisateurData extends RowDataPacket {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    id_role: number;
}

export class Utilisateur extends ElementEnCache {
    public id: number;
    public email: string;
    public nom: string;
    public prenom: string;
    public idRole: number;

    constructor(data: UtilisateurData) {
        super();
        this.id = data.id;
        this.email = data.email;
        this.nom = data.nom;
        this.prenom = data.prenom;
        this.idRole = data.id_role;
    }

    /** Obtenir le rôle de cet utilisateur */
    public async getRole(): Promise<Role> {
        const role = await roleCache.getOrFetch(this.idRole);
        if (!role) throw new Error(`Erreur de contrainte : le rôle d'id ${this.idRole} n'existe pas pour l'utilisateur d'id ${this.id}.`);
        return role;
    }
}