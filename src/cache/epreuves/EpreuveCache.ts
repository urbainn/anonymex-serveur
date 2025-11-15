import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Epreuve, EpreuveData } from "./Epreuve";

export class EpreuveCache extends DatabaseCacheBase<string /*code*/, Epreuve, EpreuveData> {

    nomTable: string = "epreuve";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve"];

    /**
     * Instancier un cache pour les épreuves d'une session donnée.
     * @param idSession
     */
    constructor(idSession: number) {
        super([idSession]);
    }

    fromDatabase(data: EpreuveData): Epreuve {
        return new Epreuve(data);
    }

    getComposanteCache(element: Epreuve): string {
        return element.codeEpreuve;
    }

}