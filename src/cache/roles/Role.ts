import { ElementEnCache } from "../base/ElementEnCacheBase";
import { RowData } from "../../core/services/Database";

export enum RolePermissions {
    AUCUNE = 0, /* Accès à la plateforme refusé */
    ADMINISTRATEUR = 1 << 0, /* Tous les droits */
    LECTURE_SEULE = 1 << 1,
    MODIFIER_SESSIONS = 1 << 2,
    DEPOSER_COPIES = 1 << 3,
    RESOUDRE_INCIDENTS = 1 << 4,
    MODIFIER_NOTES = 1 << 5,
    GERER_UTILISATEURS = 1 << 6,
}

export interface RoleData extends RowData {
    id_role: number;
    nom: string;
    permissions: number; /* Bitmask */
}

export class Role extends ElementEnCache {
    public id: number;
    public nom: string;
    public permissions: number; /* Bitmask */

    constructor(data: RoleData) {
        super();
        this.id = data.id_role;
        this.nom = data.nom;
        this.permissions = data.permissions;
    }

    /**
     * Vérifier si une permission est accordée à ce rôle.
     * @param permission Permission(s) à vérifier.
     * @return true si la permission est accordée, false sinon.
     */
    public permet(permission: RolePermissions): boolean {
        return ((this.permissions & permission) === permission) || (this.permissions === RolePermissions.ADMINISTRATEUR);
    }
}