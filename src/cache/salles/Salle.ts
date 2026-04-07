import { APISalle } from "../../contracts/salles";
import { ElementEnCache } from "../base/ElementEnCacheBase";

export interface SalleData {
    code_salle: string,
    libelle_salle: string,
    code_batiment: string,
    libelle_batiment: string
}

export class Salle extends ElementEnCache {
    public codeSalle: string;
    public libelleSalle: string;
    public codeBatiment: string;
    public libelleBatiment: string;

    constructor(data: SalleData) {
        super();
        this.codeSalle = data.code_salle;
        this.libelleSalle = data.libelle_salle;
        this.codeBatiment = data.code_batiment;
        this.libelleBatiment = data.libelle_batiment;
    }

    public toJSON(): APISalle {
        return {
            codeSalle: this.codeSalle,
            libelleSalle: this.libelleSalle,
            codeBatiment: this.codeBatiment,
            libelleBatiment: this.libelleBatiment
        }
    }
}