import { RowDataPacket } from "mysql2";
import { ElementEnCache } from "../base/ElementEnCacheBase";
import { SessionsStatut } from "../../contracts/sessions"

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

    constructor(data: SessionData) {
        super();
        this.id = data.id_session;
        this.nom = data.nom;
        this.annee = data.annee;
        this.statut = data.statut;
    }
}