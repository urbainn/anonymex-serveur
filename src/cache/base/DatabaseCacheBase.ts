import { RowDataPacket } from "mysql2";
import { Database } from "../../core/services/Database";
import { CacheBase } from "./CacheBase";
import { ElementEnCache } from "./ElementEnCacheBase";

/**
 * Base abstraite pour les classes de cache basée sur une table de base de données. 
 * Les éléments sont indexés par une clé primaire faite d'une colonne, ou plusieurs (imbrication).
 * 
 * Une clé primaire de n composantes est faite ici de n-1 composantes parentes (valeurs données à l'instanciation dans le constructeur)
 * et de la composante propre à ce cache (obtenue via `getComposanteCache`).
 * 
 * En clair, les composantes parentes sont **fixes/immuables** pour une instance de cache donnée, seule
 * la composante propre à ce cache varie entre les éléments.
 * @template I Le type de la composante de la clé primaire correspondant à ce cache.
 * @template T Le type des données mises en cache.
 * @template D Le type des données telles qu'elles sont stockées dans la base de données (brut, avant transformation en T).
 */
export abstract class DatabaseCacheBase<I extends string | number, T extends ElementEnCache, D extends RowDataPacket> extends CacheBase<I, T> {

    /** Nom de la table associée */
    abstract nomTable: string;

    /** Noms des colonnes composant la clé primaire, dans l'ordre d'imbrication.
     * Par exemple, si ce cache est imbriqué dans une session, la clé primaire est `(id_session, <composant clé primaire de ce cache>)`. */
    abstract colonnesClePrimaire: string[];

    /** Valeurs des composantes parentes de la clé primaire, si ce cache est imbriqué. */
    protected readonly valeursComposantesParent: (string | number)[] | undefined;

    /** Fonction de D vers T, c'est à dire d'un objet de la BDD en une instance de T */
    abstract fromDatabase(data: D): T;

    /** Obtenir la valeur de la composante de la clé primaire propre à ce cache. Les valeurs des composantes parentes
     * sont données à l'instanciation du cache. */
    abstract getComposanteCache(element: T): I;

    /**
     * @param valeursComposantesParent Valeurs des composantes parentes de la clé primaire, si ce cache est imbriqué.
     */
    constructor(valeursComposantesParent?: (string | number)[]) {
        super();
        this.valeursComposantesParent = valeursComposantesParent;
    }

    /**
     * Récupérer un élément du cache ou de la base de données.
     * @param id Clé primaire de l'élément à récupérer. Dans le format attendu par getComposanteCache.
     * @return élément ou undefined s'il n'est pas en cache ou dans la BDD.
     */
    public async getOrFetch(id: I): Promise<T | undefined> {
        let element = this.get(id);
        if (!element) {
            // Récupérer depuis la BDD
            // Associer un paramètre '?' par colonne de la clé primaire
            const whereSql = this.colonnesClePrimaire.map((colonne) => `\`${colonne}\` = ?`).join(" AND ");
            const sql = `SELECT * FROM \`${this.nomTable}\` WHERE ${whereSql} LIMIT 1;`;

            // assembler les composantes de la clé primaire (parentes + propre à ce cache)
            const valeursPK = this.valeursComposantesParent ? [...this.valeursComposantesParent, id] : [id];

            // Requête
            const results = await Database.query<D>(sql, valeursPK);
            if (results.length > 0) {
                // Transformer en élément et le mettre en cache
                element = this.fromDatabase(results[0]!);
                this.set(this.getComposanteCache(element), element);
            }
        }

        return element;
    }

    /**
     * Séléctionner tous les éléments de la table associée. Si la clé primaire est composée de plusieurs colonnes,
     * ne renvoit que les éléments correspondant aux composantes parentes données à l'instanciation du cache.
     * @param clause SQL optionnelle à ajouter à la requête (ex: ORDER BY, LIMIT, etc).
     * @return Liste des éléments.
     */
    public async getAll(clause?: string): Promise<T[]> {
        // Sélectionner les éléments des composantes parentes SI il y en a
        const whereSql = this.colonnesClePrimaire.length > 1 && this.valeursComposantesParent
            ? `WHERE ${this.colonnesClePrimaire.slice(0, -1 /* ..sauf la dernière */).map((colonne) => `\`${colonne}\` = ?`).join(" AND ")}`
            : "";
        const sql = `SELECT * FROM \`${this.nomTable}\` ${whereSql} ${clause ?? ""};`;

        const results = this.valeursComposantesParent
            ? await Database.query<D>(sql, this.valeursComposantesParent)
            : await Database.query<D>(sql);

        const elements: T[] = [];
        for (const row of results) {
            const element = this.fromDatabase(row);
            this.set(this.getComposanteCache(element), element);
            elements.push(element);
        }

        return elements;
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
        this.set(this.getComposanteCache(element), element);
    }

    /**
     * Mutation : supprimer un élément de la BDD et du cache.
     * @param id Clé primaire de l'élément à supprimer. Dans le format attendu par getValeursClePrimaire.
     */
    public async delete(id: I): Promise<void> {
        // Construire la requête de suppression
        const whereSql = this.colonnesClePrimaire.map((colonne) => `\`${colonne}\` = ?`).join(" AND ");
        const sql = `DELETE FROM \`${this.nomTable}\` WHERE ${whereSql};`;

        const valeursPK = this.valeursComposantesParent ? [...this.valeursComposantesParent, id] : [id];

        await Database.execute(sql, valeursPK);
        this.delete(id);
    }

    /**
     * Compter le nombre d'éléments dans la table associée.
     * @return Nombre d'éléments.
     */
    public async count(): Promise<number> {
        const sql = `SELECT COUNT(*) AS count FROM \`${this.nomTable}\`;`;
        const results = await Database.query<{ count: number }>(sql);
        return results[0]!.count;
    }
}