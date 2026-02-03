import { existsSync, readFileSync } from "fs";
import { ConnectionOptions, createPool, Pool, ResultSetHeader, type RowDataPacket } from "mysql2";
import { join } from "path";
import { logInfo } from "../../../utils/logger";
import { ConfigManager } from "../ConfigManager";
import config from "../../../../config/config.json";
import { Transaction } from "./Transaction";

export interface RowData {
    [column: string]: any;
}

/**
 * Wrapper d'accès à la base de données MySQL anonymex.
 */
export class Database {

    /** Pool de connexions. Undefined tant que non initialisé */
    private static pool: Pool | undefined;

    /**
     * Créé et retourne la pool de connexion à la base de données.
     * @returns Pool de connexion.
     */
    public static async connexion(): Promise<Pool> {
        if (this.pool !== undefined) {
            return this.pool;
        }

        const access: ConnectionOptions = {
            user: ConfigManager.getVarEnv("BDD_USER_NAME"),
            password: ConfigManager.getVarEnv("BDD_PASSWORD"),
            database: ConfigManager.getVarEnv("BDD_NAME"),
            port: Number(ConfigManager.getVarEnv("BDD_PORT")),
            host: ConfigManager.getVarEnv("BDD_HOST")
        };

        // Créer la pool de connexion
        this.pool = createPool(access);

        // Importer le schéma initial si nécessaire
        const bddEstVide = await this.importer();
        if (!bddEstVide) {
            // Appliquer les patchs de mise à jour si nécessaire
            await this.appliquerPatchs();
        }

        return this.pool;
    }

    /**
     * Faire une requête de selection.
     * @template T Le type des lignes retournées.
     * @param sql Requête SQL.
     * @param params paramètres de la requête 
     */
    public static async query<T extends { [column: string]: any; }>(sql: string, params?: any[]): Promise<T[]> {
        const pool = await this.connexion();
        return new Promise<T[]>((resolve, reject) => {
            pool.query<(RowDataPacket & T)[]>(sql, params, (err, results) => {
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

        const results = await this.query<{ nbTables: number }>("SELECT COUNT(*) as nbTables FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = ?", [ConfigManager.getVarEnv("BDD_NAME")]);
        if (results.length > 0 && results[0]!.nbTables === 0) {

            // Fichier sql contenant le schéma de la BDD
            const sqlFilePath = join(__dirname, "..", "..", "..", "..", "config", "schemas", "initial.sql");
            const sqlFile = readFileSync(sqlFilePath, "utf-8");

            await this.executerSQL(sqlFile);

            // Créer la config cachée persistante avec le numéro de patch courant
            // pour pouvoir mettre à jour la BDD plus tard si besoin.
            const configCachee = ConfigManager.getConfigCachee() ?? ConfigManager.nouvelleConfigCachee();
            configCachee.patch = config.patchNb;
            ConfigManager.enregistrerConfigCachee(configCachee);

            logInfo("Database", "Tables créées avec succès.");
            return true;
        }

        return false;
    }

    /**
     * Appliquer les patchs de mise à jour de la BDD, en fonction du numéro de patch courant (config cachée vs. config).
     */
    static async appliquerPatchs(): Promise<void> {

        // Créer la config cachée si inexistante
        const configCachee = ConfigManager.getConfigCachee();
        if (!configCachee) {
            ConfigManager.enregistrerConfigCachee(ConfigManager.nouvelleConfigCachee());
            return;
        }

        const numeroPatchActuel = config.patchNb;
        const dernierPatchApplique = configCachee.patch;

        if (typeof dernierPatchApplique !== 'number') {
            throw new Error('Configuration cachée mal formée : le numéro de patch doit être un nombre. Voir config/.configCachee.json.');
        } else if (typeof numeroPatchActuel !== 'number') {
            throw new Error('Configuration locale mal formée : le numéro de patch doit être un nombre. Voir config/config.json.');
        }

        // Faut-il appliquer des patchs ?
        if (dernierPatchApplique < numeroPatchActuel) {
            logInfo('Database', `Mise à jour de la BDD : application de ${numeroPatchActuel - dernierPatchApplique} patch(s).`);

            const startTime = Date.now();

            // du dernier patch jusqu'au patch actuel..
            for (let patch = dernierPatchApplique + 1; patch <= numeroPatchActuel; patch++) {

                // lire le fichier de patch
                const patchFilePath = join(__dirname, "..", "..", "..", "config", "schemas", `patch-${patch}.sql`);
                if (!existsSync(patchFilePath)) {
                    throw new Error(`Patch #${patch} introuvable : ${patchFilePath}. Vérifiez votre installation.`);
                }

                const patchFile = readFileSync(patchFilePath, "utf-8");
                await this.executerSQL(patchFile);

            }

            logInfo('Database', `Mise à jour de la BDD terminée en ${Date.now() - startTime}ms.`);

            // Mettre à jour le numéro de patch dans la config cachée
            configCachee.patch = numeroPatchActuel;
            ConfigManager.enregistrerConfigCachee(configCachee);
        }
    }

    /**
     * Exécuter le contenu d'un fichier SQL.
     * @param sqlContent au format texte, brut
     */
    private static async executerSQL(sqlContent: string): Promise<void> {
        // Exécuter les instructions du script une par une pour éviter le multi statement et problèmes
        const statements = sqlContent
            .split(/;\s*/)
            .map((statement) => statement.trim())
            .filter((statement) => statement.length > 0);

        for (const statement of statements) {
            await this.execute(statement);
        }
    }

    /**
     * Créer une transaction.
     * @return instance de Transaction
     */
    public static async creerTransaction(): Promise<Transaction> {
        const pool = await this.connexion();
        return new Promise<Transaction>((resolve, reject) => {
            pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(new Transaction(connection));
                }
            });
        });
    }
}