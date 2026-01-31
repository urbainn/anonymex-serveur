import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Role, RoleData } from "./Role";

class RoleCache extends DatabaseCacheBase<number /*id*/, Role, RoleData> {

    nomTable: string = "role";
    colonnesClePrimaire: string[] = ["id_role"];

    fromDatabase(data: RoleData): Role {
        return new Role(data);
    }

    getComposanteCache(element: Role): number {
        return element.id;
    }

}

export const roleCache = new RoleCache();