import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import config from "../../../config/config.json";
import dotenv from "dotenv";

interface ConfigCachee {
    patch: number;
}

export class ConfigManager {

    /**
     * Contient la configuration cachée, enregistrée en local afin de conserver certaines informations
     * entre les mises à jour du logiciel (ex: dernier patch appliqué).
     */
    private static configCachee: ConfigCachee | undefined;

    /** Variables d'environnement (.env). */
    private static envConfig = dotenv.config();

    /**
     * Lire une variable d'environnement ou lève une erreur si elle n'est pas définie.
     * @param nomVar nom de la var
     * @returns
     */
    public static getVarEnv(nomVar: string): string {
        const valeur = this.envConfig.parsed ? this.envConfig.parsed[nomVar] : process.env[nomVar];
        if (valeur === undefined) throw new Error(`La variable d'environnement ${nomVar} doit être définie.`);
        else return valeur;
    }

    /**
     * Charger/lire la config cachée, sinon renvoie undefined.
     */
    private static lireConfigCachee(): ConfigCachee | undefined {
        if (this.configCachee !== undefined) return this.configCachee;

        try {
            const data = readFileSync(join(__dirname, "..", "..", "..", "config", ".configCachee.json"), "utf-8");
            this.configCachee = JSON.parse(data) as ConfigCachee;
            return this.configCachee;
        } catch (err) {
            return undefined;
        }
    }

    /**
     * Renvoit la config cachée courante.
     */
    public static getConfigCachee(): ConfigCachee | undefined {
        const configCachee = this.lireConfigCachee();
        return configCachee;
    }

    /**
     * Définir et enregistrer une config cachée.
     * @param config Config à enregistrer.
     */
    public static enregistrerConfigCachee(config: ConfigCachee): void {
        this.configCachee = config;
        writeFileSync(join(__dirname, "..", "..", "..", "config", ".configCachee.json"), JSON.stringify(config, null, 4), "utf-8");
    }

    /**
     * Renvoit une nouvelle config cachée, remplie avec les valeurs par défaut.
     */
    public static nouvelleConfigCachee(): ConfigCachee {
        return {
            patch: config.patchNb
        };
    }
}