import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Utilisateur, UtilisateurData } from "./Utilisateur";

class UtilisateurCache extends DatabaseCacheBase<number /*id*/, Utilisateur, UtilisateurData> {

    nomTable: string = "utilisateur";
    colonnesClePrimaire: string[] = ["id_utilisateur"];

    /** Aucun utilisateur enregistré : Autorise la création du premier utilisateur (sans lien d'invitation) */
    private aucunUtilisateurEnregistre: boolean | null = null;

    fromDatabase(data: UtilisateurData): Utilisateur {
        return new Utilisateur(data);
    }

    getComposanteCache(element: Utilisateur): number {
        return element.id;
    }

    /**
     * Renvoit vrai s'il n'y a aucun utilisateur enregistré dans la BDD.
     * @cache Résultat mis en cache.
     */
    public async isAucunUtilisateurEnregistre(): Promise<boolean> {
        if (this.aucunUtilisateurEnregistre === null) {
            const nbUtilisateurs = await this.count();
            this.aucunUtilisateurEnregistre = (nbUtilisateurs === 0);
        }
        return this.aucunUtilisateurEnregistre;
    }

}

export const utilisateurCache = new UtilisateurCache();