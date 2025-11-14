import { RowDataPacket } from "mysql2";
import { ElementEnCache } from "../base/ElementEnCacheBase";
import { Session } from "../sessions/Session";
import { sessionCache } from "../sessions/SessionCache";
import { EpreuveStatut } from "../../contracts/epreuves";

export interface EpreuveData extends RowDataPacket {
    id_session: number,
    code_epreuve: string,
    nom: string,
    statut: number,
    date_epreuve: number,
    duree: number,
    inscrits: number
}

export class Epreuve extends ElementEnCache {
    public idSession: number;
    public codeEpreuve: string;
    public nom: string;
    public statut: EpreuveStatut;
    public dateEpreuve: number;
    public duree: number;
    public inscrits: number;

    constructor(data: EpreuveData) {
        super();
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.nom = data.nom;
        this.statut = data.statut;
        this.dateEpreuve = data.date_epreuve;
        this.duree = data.duree;
        this.inscrits = data.inscrits;
    }

    /** Obtenir la session de cette epreuve */
    public async getSession(): Promise<Session> {
        const session = await sessionCache.getOrFetch(this.idSession);
        if(!session) throw new Error(`Erreur de contrainte : la session d'id ${this.idSession} n'existe pas pour l'épreuve de code ${this.codeEpreuve}.`);
        return session;
    }
}