import { Database } from "../../core/services/database/Database";
import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Epreuve, EpreuveData } from "./Epreuve";
import { IncidentData } from "./incidents/Incident";

export class EpreuveCache extends DatabaseCacheBase<string /*code*/, Epreuve, EpreuveData> {

    nomTable = "epreuve";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve"];

    private idSession: number;

    /**
     * Instancier un cache pour les épreuves d'une session donnée.
     * @param idSession
     */
    constructor(idSession: number) {
        super([idSession]);
        this.idSession = idSession;
    }

    fromDatabase(data: EpreuveData): Epreuve {
        return new Epreuve(data);
    }

    getComposanteCache(element: Epreuve): string {
        return element.codeEpreuve;
    }

    /**
     * Récupère toutes les épreuves de la session, et si force=false, synchronise les données associées (incidents) pour chaque épreuve.
     * @param clause 
     * @param force 
     * @returns 
     */
    override async getAll(clause?: string, force?: boolean): Promise<Epreuve[]> {
        if (this.tousRecuperes && !force) return this.values();

        const res = await super.getAll(clause, force);
        if (force) return res; // si on force le fetch, on peut assumer que les données ont déjà été synchro

        // Sync les données
        const incidentsPackets = await Database.query<IncidentData>('SELECT * FROM incident WHERE id_session = ?', [this.idSession]);
        for (const incident of incidentsPackets) {
            const epreuve = this.get(incident.code_epreuve);
            if (!epreuve) continue;

            // Mettre l'incident en cache
            epreuve.incidents.set(incident.id_incident, epreuve.incidents.fromDatabase(incident));
        }

        // Marquer les données comme synchronisées
        for (const epreuve of res) {
            epreuve.incidents['tousRecuperes'] = true;
        }

        return res;
    }

}