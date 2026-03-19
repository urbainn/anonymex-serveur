import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Convocation, ConvocationData } from "./Convocation";

export class ConvocationCache extends DatabaseCacheBase<string /*codeAnonymat*/, Convocation, ConvocationData> {

    nomTable = "convocation";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "code_anonymat"];

    /**
     * Instancier un cache pour les convocations d'une épreuve donnée.
     * @param idSession
     * @param idEpreuve
     */
    constructor(idSession: number, idEpreuve: string) {
        super([idSession, idEpreuve]);
    }

    fromDatabase(data: ConvocationData): Convocation {
        return new Convocation(data);
    }

    getComposanteCache(element: Convocation): string {
        return element.codeAnonymat;
    }

}