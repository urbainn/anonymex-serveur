import { ElementEnCache } from "../base/ElementEnCacheBase";
import { RowData } from "../../core/services/Database";
import { APIIncident } from "../../contracts/incidents";

export interface IncidentData extends RowData {
    id_incident: number;
    id_session: number;
    code_epreuve: string;
    titre: string;
    details: string;
    resolu: boolean;
    code_anonymat: string | null;
    note_quart: number | null;
}

export class Incident extends ElementEnCache {
    public idIncident: number;
    public idSession: number;
    public codeEpreuve: string;
    public titre: string;
    public details: string;
    public resolu: boolean;
    public codeAnonymat: string | null;
    public noteQuart: number | null;

    constructor(data: IncidentData) {
        super();
        this.idIncident = data.id_incident;
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.titre = data.titre;
        this.details = data.details;
        this.resolu = data.resolu;
        this.codeAnonymat = data.code_anonymat;
        this.noteQuart = data.note_quart;
    }

    public toJSON(): APIIncident {
        return {
            idIncident: this.idIncident,
            idSession: this.idSession,
            codeEpreuve: this.codeEpreuve,
            titre: this.titre,
            details: this.details,
            resolu: this.resolu,
            codeAnonymat: this.codeAnonymat ?? undefined,
            noteQuart: this.noteQuart ?? undefined
        }
    }
}