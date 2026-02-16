import { RowData } from "../../core/services/database/Database";
import { ElementEnCache } from "../base/ElementEnCacheBase";

export interface ConvocationData extends RowData {
    id_session: number,
    code_epreuve: string,
    numero_etudiant: number,
    code_anonymat: string,
    note_quart: number | null,
    id_salle: number,
    rang: number | null // TODO : quand nouvelle version adapter avec le numéro de place (TEMPORAIRE !)
}

export class Convocation extends ElementEnCache {
    public idSession: number;
    public codeEpreuve: string;
    public numeroEtudiant: number;
    public codeAnonymat: string;
    public noteQuart: number | null;
    public idSalle: number;
    public rang: number | null; // TODO (TEMPORAIRE !)

    constructor(data: ConvocationData) {
        super();
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.numeroEtudiant = data.numero_etudiant;
        this.codeAnonymat = data.code_anonymat;
        this.noteQuart = data.note_quart;
        this.idSalle = data.id_salle;
        this.rang = data.rang;
    }
}