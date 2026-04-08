import { APISession, SessionsStatut } from "../../contracts/sessions"
import { EpreuveCache } from "../epreuves/EpreuveCache";
import { ElementEnCacheBdd } from "../base/ElementEnCacheBdd";
import { SessionCache } from "./SessionCache";


export interface SessionData {
    id_session: number,
    nom: string,
    annee: number,
    statut: number
}

export class Session extends ElementEnCacheBdd<SessionData> {
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

    public serialize(): Buffer {
        return SessionCache.serialiseur.serialize(this.toData());
    }

    public toData(): SessionData {
        return {
            id_session: this.id,
            nom: this.nom,
            annee: this.annee,
            statut: this.statut
        }
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