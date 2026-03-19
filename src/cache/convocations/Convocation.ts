import { ElementEnCache } from "../base/ElementEnCacheBase";

export interface ConvocationData {
    id_session: number,
    code_epreuve: string,
    numero_etudiant: number | null,
    code_anonymat: string,
    note_quart: number | null,
    code_salle: string,
    rang: number | null
}

export class Convocation extends ElementEnCache {
    public idSession: number;
    public codeEpreuve: string;
    public numeroEtudiant: number | null;
    public codeAnonymat: string;
    public noteQuart: number | null;
    public codeSalle: string;
    public rang: number | null;

    constructor(data: ConvocationData) {
        super();
        this.idSession = data.id_session;
        this.codeEpreuve = data.code_epreuve;
        this.numeroEtudiant = data.numero_etudiant;
        this.codeAnonymat = data.code_anonymat;
        this.noteQuart = data.note_quart;
        this.codeSalle = data.code_salle;
        this.rang = data.rang;
    }
}