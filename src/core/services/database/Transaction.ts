import { PoolConnection, RowDataPacket } from "mysql2";

/**
 * Représente une transaction de base de données.
 */
export class Transaction {

    private conn: PoolConnection;

    constructor(conn: PoolConnection) {
        this.conn = conn;
    }

    public async query<T extends { [column: string]: any; }>(sql: string, params?: any[]): Promise<T[]> {
        return new Promise<T[]>((resolve, reject) => {
            this.conn.query<(RowDataPacket & T)[]>(sql, params, (err, results) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(results as T[]);
                }
            });
        });
    }

    public async execute(sql: string, params?: any[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.conn.execute(sql, params, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Commit la transaction. Relâche ensuite la connexion (sauf si erreur).
     * @returns 
     */
    public async commit(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.conn.commit((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.conn.release();
                    resolve();
                }
            });
        });
    }

    /**
     * Rollback la transaction. Relâche ensuite la connexion.
     * @returns 
     */
    public async rollback(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.conn.rollback(() => {
                this.conn.release();
                resolve();
            });
        });
    }

}