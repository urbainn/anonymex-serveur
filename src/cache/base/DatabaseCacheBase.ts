import { RowDataPacket } from "mysql2";
import { Database } from "../../core/services/Database";
import { CacheBase } from "./CacheBase";
import { ElementEnCache } from "./ElementEnCacheBase";

/**
 * Base abstraite pour les classes de cache basée sur une table de base de données. 
 * Les éléments sont indexés par une clé.\
 * @template I Le type des clés utilisées pour indexer les éléments.
 * @template T Le type des données mises en cache.
 * @template D Le type des données telles qu'elles sont stockées dans la base de données (brut, avant transformation en T).
 */
export abstract class DatabaseCacheBase<I, T extends ElementEnCache, D extends RowDataPacket> extends CacheBase<I, T> {

    /** Nom de la table associée */
    abstract nomTable: string;

    /** Nom des colonnes composant la clé primaire */
    abstract colonnesClePrimaire: string[];

    /** Fonction de D vers T, c'est à dire d'un objet de la BDD en une instance de T */
    abstract fromDatabase(data: D): T;

    /** Obtenir le couple de clés primaires pour un élément */
    abstract getValeursClePrimaire(element: T): I;

    /**
     * Récupérer un élément du cache ou de la base de données.
     * @param valeursKp
     * @return élément ou undefined s'il n'est pas en cache ou dans la BDD.
     */
    public async getOrFetch(id: I): Promise<T | undefined> {
        let element = this.get(id);
        if (!element) {
            // Récupérer depuis la BDD
            // Associer un paramètre '?' par colonne de la clé primaire
            const whereSql = this.colonnesClePrimaire.map((colonne) => `\`${colonne}\` = ?`).join(" AND ");
            const sql = `SELECT * FROM \`${this.nomTable}\` WHERE ${whereSql} LIMIT 1;`;

            // Parser les valeurs de la clé primaire (tjrs un tableau, au cas où I serait un type simple)
            const valeursKp = Array.isArray(id) ? id : [id];

            // Requête
            const results = await Database.query<D[]>(sql, valeursKp);
            if (results.length > 0) {
                // Transformer en élément et le mettre en cache
                element = this.fromDatabase(results[0]!);
                this.set(this.getValeursClePrimaire(element), element);
            }
        }

        return element;
    }

    /**
     * Muter un élément dans la base de données et le mettre à jour en cache.
     * @param element Élément à muter.
     * @param sql SQL de mutation (INSERT, UPDATE, DELETE, ...).
     * @param params Paramètres de la requête SQL.
     */
    public async muter(element: T, sql: string, params?: any[]): Promise<void> {
        await Database.execute(sql, params);
        this.set(this.getValeursClePrimaire(element), element);
    }

}