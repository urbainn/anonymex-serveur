import mysql, { ConnectionOptions, RowDataPacket } from "mysql2";
import fs from "fs";
import path from "path";

function checkVarEnv(nomVar: string): string {
    const valeur = process.env[nomVar];
    if(valeur === undefined) throw new Error(`La variable d'environement ${nomVar} doit être définie.`);
    else return valeur;
}

export function initialisationBDD() {
    const access: ConnectionOptions = {
        user: checkVarEnv("BDD_USER_NAME"),
        password: checkVarEnv("BDD_PASSWORD"),
        database: checkVarEnv("BDD_NAME"),
        port: Number(checkVarEnv("BDD_PORT")),
        host: checkVarEnv("BDD_HOST")
    };

    const connexion = mysql.createConnection(access);

    const sqlFilePath = path.join(__dirname, "..", "bdd.sql");
    const sqlFile = fs.readFileSync(sqlFilePath, "utf-8");

    connexion.query<RowDataPacket[]>(`SELECT COUNT(*) as nbTables FROM information_schema.tables WHERE table_type = 'BASE TABLE' AND table_schema = '${checkVarEnv("BDD_NAME")}'`, 
    (err, results) => {
        if(err) {
            console.log("Erreur lors de la vérification des tables: ", err);
            connexion.end();
        }

        if(results.length > 0 && results[0]!.nbTables === 0) {
            connexion.query(sqlFile, (err) => {
                if(err) {
                    console.log("Erreur lors de la création des tables: ", err);
                }
                else {
                    console.log("Tables créées avec succès.");
                }
                connexion.end();
            })
        }
        else {
            console.log("Erreur des tables existent déjà.");
            connexion.end();
        }

    });
}
