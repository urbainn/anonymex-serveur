import { readFileSync } from "fs";
import { ConnectionOptions, createConnection, createPool, Pool, ResultSetHeader, RowDataPacket } from "mysql2";
import { join } from "path";
import { logInfo } from "../../utils/logger";

/**
 * Wrapper d'accès à la base de données MySQL anonymex.
 */
export class Database {

    /** Pool de connexions. Undefined tant que non initialisé */
    private static pool: Pool | undefined;

    /**
     * Récupère la variable d'environnement ou lève une erreur si elle n'est pas définie.
     * @param nomVar nom de la var
     * @returns 
     */
    private static getVarEnv(nomVar: string): string {
        const valeur = process.env[nomVar];
        if (valeur === undefined) throw new Error(`La variable d'environement ${nomVar} doit être définie.`);
        else return valeur;
    }

    /**
     * Créé et retourne la pool de connexion à la base de données.
     * @returns Pool de connexion.
     */
    public static async connexion(): Promise<Pool> {
        if (this.pool !== undefined) {
            return this.pool;
        }

        const access: ConnectionOptions = {
            user: this.getVarEnv("BDD_USER_NAME"),
            password: this.getVarEnv("BDD_PASSWORD"),
            database: this.getVarEnv("BDD_NAME"),
            port: Number(this.getVarEnv("BDD_PORT")),
            host: this.getVarEnv("BDD_HOST")
        };

        // Créer la pool de connexion
        this.pool = createPool(access);

        // Importer le schéma initial si nécessaire
        await this.importer();

        return this.pool;
    }

    /**
     * Faire une requête de selection.
     * @param sql Requête SQL.
     * @param params paramètres de la requête 
     */
    public static async query<T extends RowDataPacket[]>(sql: string, params?: any[]): Promise<T> {
        const pool = await this.connexion();
        return new Promise<T>((resolve, reject) => {
            pool.query<T>(sql, params, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * Faire une requête de mutation (insert, update, delete, ...).
     * @param sql Requête SQL.
     * @param params paramètres de la requête
     */
    public static async execute(sql: string, params?: any[]): Promise<ResultSetHeader> {
        const pool = await this.connexion();
        return new Promise<ResultSetHeader>((resolve, reject) => {
            pool.execute<ResultSetHeader>(sql, params, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            });
        });
    }

    /**
     * Importer le schéma initial de la base de données, si celle-ci est vide.
     * @return true si l'import a été fait, false si la BDD n'était pas vide.
     */
    private static async importer(): Promise<boolean> {

        const results = await this.query<RowDataPacket[]>("SELECT COUNT(*) as nbTables FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = ?", [this.getVarEnv("BDD_NAME")]);
        if (results.length > 0 && results[0]!.nbTables === 0) {

            // Fichier sql contenant le schéma de la BDD
            const sqlFilePath = join(__dirname, "..", "bdd.sql");
            const sqlFile = readFileSync(sqlFilePath, "utf-8");

            // Exécuter le script de création des tables
            await this.execute(sqlFile);
            logInfo("Database", "Tables créées avec succès.");
            return true;
        }

        return false;
    }

}