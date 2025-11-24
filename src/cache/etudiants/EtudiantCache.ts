import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { EtudiantData, Etudiant } from "./Etudiant";

export class EtudiantCache extends DatabaseCacheBase<number /*numero*/, Etudiant, EtudiantData> {

    nomTable: string = "etudiant";
    colonnesClePrimaire: string[] = ["numero_etudiant"];

        fromDatabase(data: EtudiantData): Etudiant {
            return new Etudiant(data);
        }
    
        getComposanteCache(element: Etudiant): number {
            return element.numeroEtudiant;
        }
}

export const etudiantCache = new EtudiantCache();

