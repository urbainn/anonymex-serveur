import { ResultSetHeader } from "mysql2";
import { MediaService } from "../../../core/services/MediaService";
import { logWarn } from "../../../utils/logger";
import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Incident, IncidentData } from "./Incident";
import { Database } from "../../../core/services/database/Database";

export class IncidentCache extends DatabaseCacheBase<number /*id*/, Incident, IncidentData> {

    nomTable = "incident";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "id_incident"];

    private idSession: number;
    private codeEpreuve: string;

    /**
     * Instancier un cache pour les incidents d'une épreuve donnée.
     * @param idSession
     * @param codeEpreuve
     */
    constructor(idSession: number, codeEpreuve: string) {
        super([idSession, codeEpreuve]);
        this.idSession = idSession;
        this.codeEpreuve = codeEpreuve;
    }

    /**
     * Supprime un incident de la BDD, du cache, et supprime le scan associé à l'incident corrigé.
     * @param incidentId L'ID de l'incident à supprimer.
     */
    override async delete(incidentId: number): Promise<ResultSetHeader> {
        const result = await super.delete(incidentId);

        // Supprimer le scan de l'incident corrigé
        if (result.affectedRows > 0) {
            await MediaService.supprimerMedia('incidents/', `${incidentId}.webp`).catch(() => {
                logWarn("postIncident", `Impossible de supprimer le scan de l'incident ${incidentId}. Le fichier n'existe peut-être plus.`);
            });
        }

        return result;
    }

    /**
     * Trouver les suggestions de code anonymat pour un incident donné. 
     * Les '?' seront cherchés comme caractères génériques à compléter. 
     * @param codeAnonymatPartiel Le code anonymat partiel à compléter, avec des '?' pour les caractères manquants.
     * @returns Une liste de suggestions de code anonymat complétés.
     */
    async suggererCodesAnonymat(codeAnonymatPartiel: string): Promise<string[]> {
        // Chercher les 3 premiers caractères et 3 derniers caractères du code anonymat NON partiel
        const prefix = codeAnonymatPartiel.slice(0, 3);
        const suffix = codeAnonymatPartiel.slice(-3);

        const query = `SELECT code_anonymat FROM convocation 
                       WHERE code_epreuve = ? AND id_session = ? 
                       AND code_anonymat LIKE ? AND code_anonymat LIKE ?`;
        const params = [this.codeEpreuve, this.idSession, `${prefix}%`, `%${suffix}`];

        const resStrict = await Database.query<{ code_anonymat: string }>(query, params);
        if (resStrict.length > 0) {
            return resStrict.map(r => r.code_anonymat);
        }

        // Rien trouvé ? Rechercher en remplaçant les '?' par des caractères génériques SQL
        const codeAnonymatSQL = codeAnonymatPartiel.replace(/\?/g, '_');
        const resFuzzy = await Database.query<{ code_anonymat: string }>(query, [this.codeEpreuve, this.idSession, codeAnonymatSQL, codeAnonymatSQL]);
        return resFuzzy.map(r => r.code_anonymat);

    }

    fromDatabase(data: IncidentData): Incident {
        return new Incident(data);
    }

    getComposanteCache(element: Incident): number {
        return element.idIncident;
    }

}