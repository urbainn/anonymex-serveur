import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Utilisateur, UtilisateurData } from "./Utilisateur";

class UtilisateurCache extends DatabaseCacheBase<number /*id*/, Utilisateur, UtilisateurData> {

    nomTable: string = "utilisateur";
    colonnesClePrimaire: string[] = ["id_utilisateur"];

    fromDatabase(data: UtilisateurData): Utilisateur {
        return new Utilisateur(data);
    }

    getComposanteCache(element: Utilisateur): number {
        return element.id;
    }

}

export const utilisateurCache = new UtilisateurCache();