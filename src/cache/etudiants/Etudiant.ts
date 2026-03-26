import { ElementEnCache } from "../base/ElementEnCacheBase";

export interface EtudiantData {
    numero_etudiant: number,
    nom: string,
    prenom: string
}

export class Etudiant extends ElementEnCache {
    public numeroEtudiant: number;
    public nom: string;
    public prenom: string;

    public fromData(data: Partial<EtudiantData>): this {
        if (data.numero_etudiant !== undefined) this.numeroEtudiant = data.numero_etudiant;
        if (data.nom !== undefined) this.nom = data.nom;
        if (data.prenom !== undefined) this.prenom = data.prenom;
        return this;
    }

    constructor(data: EtudiantData) {
        super();
        this.numeroEtudiant = data.numero_etudiant;
        this.nom = data.nom;
        this.prenom = data.prenom;
    }
}