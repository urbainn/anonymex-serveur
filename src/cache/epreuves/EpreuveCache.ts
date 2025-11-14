import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Epreuve, EpreuveData } from "./Epreuve";

export class EpreuveCache extends DatabaseCacheBase<[number, string] /*id*/, Epreuve, EpreuveData>{

    nomTable: string = "epreuve";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve"];

    fromDatabase(data: EpreuveData): Epreuve {
        return new Epreuve(data);
    }

    getValeursClePrimaire(element: Epreuve): [number, string] {
        return [element.idSession, element.codeEpreuve];
    }

}

export const epreuveCache = new EpreuveCache();