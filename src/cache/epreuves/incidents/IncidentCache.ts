import { ResultSetHeader } from "mysql2";
import { MediaService } from "../../../core/services/MediaService";
import { logWarn } from "../../../utils/logger";
import { DatabaseCacheBase } from "../../base/DatabaseCacheBase";
import { Incident, IncidentData } from "./Incident";
import { Database } from "../../../core/services/database/Database";
import { sessionCache } from "../../sessions/SessionCache";
import { Serialiseur } from "../../base/Serialiseur";

export class IncidentCache extends DatabaseCacheBase<number /*id*/, Incident, IncidentData> {

    nomTable = "incident";
    colonnesClePrimaire: string[] = ["id_session", "code_epreuve", "id_incident"];

    private idSession: number;
    private codeEpreuve: string;

    static serialiseur = new Serialiseur<IncidentData>([
        { nom: 'id_incident', type: 'uint16' },
        { nom: 'id_session', type: 'uint16' },
        { nom: 'code_epreuve', type: 'string' },
        { nom: 'titre', type: 'string' },
        { nom: 'details', type: 'string' },
        { nom: 'code_anonymat', type: 'string', nullable: true },
        { nom: 'note_quart', type: 'uint16', nullable: true },
    ]);

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
        const epreuve = sessionCache.get(this.idSession)?.epreuves.get(this.codeEpreuve);
        if (epreuve === undefined) return [];

        // Le code est déjà complet, renvoyer vide
        await epreuve.convocations.getAll();
        if (epreuve.convocations.get(codeAnonymatPartiel) !== undefined) return [];

        const base = `SELECT code_anonymat FROM convocation 
                       WHERE code_epreuve = ? AND id_session = ?`;
        const paramsBase = [this.codeEpreuve, this.idSession];

        // Chercher en place des '?'
        const estPartiel = codeAnonymatPartiel.includes('?');
        if (estPartiel) {
            // Remplacer les '?' par des '_' pour la requête SQL
            const codeAnonymatSQL = codeAnonymatPartiel.replace(/\?/g, '_');
            const sqlPartiel = base + " AND code_anonymat LIKE ? LIMIT 5";
            const resPartiel = await Database.query<{ code_anonymat: string }>(sqlPartiel, [...paramsBase, codeAnonymatSQL]);
            if (resPartiel.length > 0) {
                return resPartiel.map(r => r.code_anonymat);
            }
        }

        // Chercher les 3 premiers caractères et 3 derniers caractères du code anonymat NON partiel
        const prefix = codeAnonymatPartiel.slice(0, 3);
        const suffix = codeAnonymatPartiel.slice(-3);

        // Récupérer les codes anonymat complets en fonction du préfix/suffix
        const prefSufSQL = base + " AND (code_anonymat LIKE ? OR code_anonymat LIKE ?) LIMIT 3";
        const resPrefSuf = await Database.query<{ code_anonymat: string }>(prefSufSQL, [...paramsBase, `${prefix}%`, `%${suffix}`]);

        return resPrefSuf.map(r => r.code_anonymat);
    }

    fromDatabase(data: IncidentData): Incident {
        return new Incident(data);
    }

    getComposanteCache(element: Incident): number {
        return element.idIncident;
    }

    serialize(): Buffer {
        const buffers: Buffer[] = [];
        for (const incident of this.values()) {
            buffers.push(IncidentCache.serialiseur.serialize(incident.toData()));
        }

        return Buffer.concat(buffers);
    }

    public static deserialize(buffer: Buffer): Incident[] {
        const res = IncidentCache.serialiseur.deserializeMany(buffer);
        return res.map(data => new Incident(data));
    }

}