import { APIIncident } from "../../../contracts/incidents";
import { ElementEnCacheBdd } from "../../base/ElementEnCacheBdd";

export interface IncidentData {
    id_incident: number;
    id_session: number;
    code_epreuve: string;
    titre: string;
    details: string;
    code_anonymat: string | null;
    note_quart: number | null;
}

export class Incident extends ElementEnCacheBdd<IncidentData> {
    public idIncident: number;
    public idSession: number;
    public codeEpreuve: string;
    public titre: string;
    public details: string;
    public codeAnonymat: string | null;
    public noteQuart: number | null;

    constructor(data: IncidentData) {
        super();
        this.idIncident = data.id_incident;
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.titre = data.titre;
        this.details = data.details;
        this.codeAnonymat = data.code_anonymat;
        this.noteQuart = data.note_quart;
    }

    public toData(): IncidentData {
        return {
            id_incident: this.idIncident,
            id_session: this.idSession,
            code_epreuve: this.codeEpreuve,
            titre: this.titre,
            details: this.details,
            code_anonymat: this.codeAnonymat,
            note_quart: this.noteQuart,
        }
    }

    public toJSON(): APIIncident {
        return {
            idIncident: this.idIncident,
            idSession: this.idSession,
            codeEpreuve: this.codeEpreuve,
            titre: this.titre,
            details: this.details,
            codeAnonymat: this.codeAnonymat ?? undefined,
            noteQuart: this.noteQuart ?? undefined
        }
    }
}