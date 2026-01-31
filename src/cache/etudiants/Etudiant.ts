import { ElementEnCache } from "../base/ElementEnCacheBase";
import { RowData } from "../../core/services/Database";

export interface EtudiantData extends RowData {
    numero_etudiant: number,
    nom: string,
    prenom: string
}

export class Etudiant extends ElementEnCache {
    public numeroEtudiant: number;
    public nom: string;
    public prenom: string;

    constructor(data: EtudiantData) {
        super();
        this.numeroEtudiant = data.numero_etudiant;
        this.nom = data.nom;
        this.prenom = data.prenom;
    }
}