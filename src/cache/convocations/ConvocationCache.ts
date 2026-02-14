import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Convocation, ConvocationData } from "./Convocation";

export class ConvocationCache extends DatabaseCacheBase<number /*numeroEtudiant*/, Convocation, ConvocationData> {

    nomTable: string = "convocation_epreuve";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "numero_etudiant"];

    /**
     * Instancier un cache pour les convocations d'une épreuve donnée.
     * @param codeEpreuve
     */
    constructor(codeEpreuve: string) {
        super([codeEpreuve]);
    }

    fromDatabase(data: ConvocationData): Convocation {
        return new Convocation(data);
    }

    getComposanteCache(element: Convocation): number {
        return element.numeroEtudiant;
    }

}