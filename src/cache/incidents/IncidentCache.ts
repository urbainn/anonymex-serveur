import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Incident, IncidentData } from "./Incident";

export class EpreuveCache extends DatabaseCacheBase<number /*id*/, Incident, IncidentData> {

    nomTable: string = "incident";
    colonnesClePrimaire: string[] = ["id_session","id_incident"];

    /**
     * Instancier un cache pour les épreuves d'une session donnée.
     * @param idSession
     */
    constructor(idSession: number) {
        super([idSession]);
    }

    fromDatabase(data: IncidentData): Incident {
        return new Incident(data);
    }

    getComposanteCache(element: Incident): number {
        return element.idIncident;
    }

}