import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Role, RoleData } from "./Role";

class RoleCache extends DatabaseCacheBase<number /*id*/, Role, RoleData> {

    nomTable = "role";
    colonnesClePrimaire: string[] = ["id_role"];

    fromDatabase(data: RoleData): Role {
        return new Role(data);
    }

    getComposanteCache(element: Role): number {
        return element.id;
    }

    serialize(): Buffer {
        return Buffer.alloc(0); // Pas besoin de sérialisation pour les rôles (ne peuvent pas être exportés)
    }

}

export const roleCache = new RoleCache();