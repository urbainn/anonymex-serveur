import { RowDataPacket } from "mysql2";
import { ElementEnCache } from "../base/ElementEnCacheBase";
import { APISession, SessionsStatut } from "../../contracts/sessions"
import { Epreuve } from "../epreuves/Epreuve";
import { EpreuveCache } from "../epreuves/EpreuveCache";

export interface SessionData extends RowDataPacket {
    id_session: number,
    nom: string,
    annee: number,
    statut: number
}

export class Session extends ElementEnCache {
    public id: number;
    public nom: string;
    public annee: number;
    public statut: SessionsStatut;

    /** Cache des épreuves associées à cette session */
    public epreuves: EpreuveCache;

    constructor(data: SessionData) {
        super();
        this.id = data.id_session;
        this.nom = data.nom;
        this.annee = data.annee;
        this.statut = data.statut;
        this.epreuves = new EpreuveCache(this.id);
    }

    public toJSON(): APISession {
        return {
            id: this.id,
            nom: this.nom,
            annee: this.annee,
            statut: this.statut
        }
    }
}