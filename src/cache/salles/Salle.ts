import { APISalle } from "../../contracts/salles";
import { ElementEnCacheBdd } from "../base/ElementEnCacheBdd";

export interface SalleData {
    code_salle: string,
    libelle_salle: string,
    code_batiment: string,
    libelle_batiment: string
}

export class Salle extends ElementEnCacheBdd<SalleData> {
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

    public toData(): SalleData {
        return {
            code_salle: this.codeSalle,
            libelle_salle: this.libelleSalle,
            code_batiment: this.codeBatiment,
            libelle_batiment: this.libelleBatiment
        }
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