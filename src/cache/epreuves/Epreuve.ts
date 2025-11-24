import { ElementEnCache } from "../base/ElementEnCacheBase";
import { Session } from "../sessions/Session";
import { sessionCache } from "../sessions/SessionCache";
import { APIEpreuve, EpreuveStatut } from "../../contracts/epreuves";
import { RowData } from "../../core/services/Database";

export interface EpreuveData extends RowData {
    id_session: number,
    code_epreuve: string,
    nom: string,
    statut: number,
    salles: string[],
    date_epreuve: number,
    duree: number,
    copies: number | null,
    copies_total: number | null,
    incidents: number | null
}

export class Epreuve extends ElementEnCache {
    public idSession: number;
    public codeEpreuve: string;
    public nom: string;
    public statut: EpreuveStatut;
    public salles: string[];
    public dateEpreuve: number;
    public duree: number;
    public copies: number | null;
    public copiesTotal: number | null;
    public incidents: number | null;

    constructor(data: EpreuveData) {
        super();
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.nom = data.nom;
        this.statut = data.statut;
        this.salles = data.salles
        this.dateEpreuve = data.date_epreuve;
        this.duree = data.duree;
        this.copies = data.copies;
        this.copiesTotal = data.copies_total;
        this.incidents = data.incidents;
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
            copies: this.copies ?? undefined,
            copiesTotal: this.copiesTotal ?? undefined,
            incidents: this.incidents ?? undefined
        }
    }
}