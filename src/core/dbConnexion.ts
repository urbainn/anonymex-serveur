import mysql, { ConnectionOptions, RowDataPacket } from "mysql2";
import fs from "fs";
import path from "path";

function checkVarEnv(nomVar: string): string {
    const valeur = process.env[nomVar];
    if (valeur === undefined) throw new Error(`La variable d'environement ${nomVar} doit être définie.`);
    else return valeur;
}

export function initialisationBDD() {
}
