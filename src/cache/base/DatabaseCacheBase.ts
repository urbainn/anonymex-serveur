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
export abstract class DatabaseCacheBase<
    I extends string | number | (string | number)[], // clé primaire
    T extends ElementEnCache, // élément (instance de classe)
    D extends RowDataPacket // données brutes de la BDD
> {

    /** Nom de la table associée */
    abstract nomTable: string;

    /** Nom des colonnes composant la clé primaire */
    abstract colonnesClePrimaire: string[];

    /** Fonction de D vers T, c'est à dire d'un objet de la BDD en une instance de T */
    abstract fromDatabase(data: D): T;

    /** Obtenir le couple de clés primaires pour un élément en format indexable.\
     * @example return element.pk1 + '-' + element.pk2; */
    abstract getValeursClePrimaire(element: T): I;

    private cache: I extends (string | number)[] ? Map<

        /**
         * Récupérer un élément du cache ou de la base de données.
         * @param id Clé primaire de l'élément à récupérer. Dans le format attendu par getValeursClePrimaire.
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
     * Mutation : insérer un nouvel élément dans la BDD et le cache.
     * @param donnees Données partielles de l'élément à insérer. doit impérativement contenir les colonnes/propriétés NOT NULL.
     * @param element L'élément à insérer en cache.
     */
    public async insert(donnees: Partial<D>, element: T): Promise<void> {
        // Construire la requête d'insertion
        const colonnes = Object.keys(donnees).map(colonne => `\`${colonne}\``).join(", ");
        const valeursPlaceholders = Object.keys(donnees).map(() => `?`).join(", ");
        const sql = `INSERT INTO \`${this.nomTable}\` (${colonnes}) VALUES (${valeursPlaceholders});`;

        const valeurs = Object.values(donnees);
        await Database.execute(sql, valeurs);
        this.set(this.getValeursClePrimaire(element), element);
    }

    /**
     * Mutation : supprimer un élément de la BDD et du cache.
     * @param id Clé primaire de l'élément à supprimer. Dans le format attendu par getValeursClePrimaire.
     */
    public async delete(id: I): Promise<void> {
        // Construire la requête de suppression
        const whereSql = this.colonnesClePrimaire.map((colonne) => `\`${colonne}\` = ?`).join(" AND ");
        const sql = `DELETE FROM \`${this.nomTable}\` WHERE ${whereSql};`;

        await Database.execute(sql, valeursKp);
        this.delete(id);
    }
}