import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Incident, IncidentData } from "./Incident";

export class IncidentCache extends DatabaseCacheBase<number /*id*/, Incident, IncidentData> {

    nomTable = "incident";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "id_incident"];

    /**
     * Instancier un cache pour les incidents d'une épreuve donnée.
     * @param idSession
     * @param codeEpreuve
     */
    constructor(idSession: number, codeEpreuve: string) {
        super([idSession, codeEpreuve]);
    }

    fromDatabase(data: IncidentData): Incident {
        return new Incident(data);
    }

    getComposanteCache(element: Incident): number {
        return element.idIncident;
    }

}