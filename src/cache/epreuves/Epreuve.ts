import { ElementEnCache } from "../base/ElementEnCacheBase";
import { Session } from "../sessions/Session";
import { sessionCache } from "../sessions/SessionCache";
import { APIEpreuve, EpreuveStatut } from "../../contracts/epreuves";
import { RowData } from "../../core/services/database/Database";

export interface EpreuveData extends RowData {
    id_session: number,
    code_epreuve: string,
    nom: string,
    statut: number,
    /* Timestamp (epoch unix) en minutes */
    date_epreuve: number,
    duree: number,
    nb_presents: number | null,
}

export class Epreuve extends ElementEnCache {
    public idSession: number;
    public codeEpreuve: string;
    public nom: string;
    public statut: EpreuveStatut;
    public salles: string[] = [];//todo
    public dateEpreuve: number;
    public duree: number;
    public copies: number = 0;//todo
    public nbPresents: number | null;
    public incidents: number = 0;//todo

    constructor(data: EpreuveData) {
        super();
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.nom = data.nom;
        this.statut = data.statut;
        this.dateEpreuve = data.date_epreuve * 60; // convertir en secondes
        this.duree = data.duree;
        this.nbPresents = data.nb_presents;
    }

    /** Obtenir la session de cette epreuve */
    public async getSession(): Promise<Session> {
        const session = await sessionCache.getOrFetch(this.idSession);
        if (!session) throw new Error(`Erreur de contrainte : la session d'id ${this.idSession} n'existe pas pour l'épreuve de code ${this.codeEpreuve}.`);
        return session;
    }

    public toJSON(): APIEpreuve {
        return {
            session: this.idSession,
            code: this.codeEpreuve,
            nom: this.nom,
            statut: this.statut,
            salles: this.salles,
            date: this.dateEpreuve,
            duree: this.duree,
            copies: this.copies,
            incidents: this.incidents
        }
    }
}