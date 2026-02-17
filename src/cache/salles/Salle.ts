import { ElementEnCache } from "../base/ElementEnCacheBase";
import { RowData } from "../../core/services/database/Database";

export interface SalleData extends RowData {
    id_salle: number,
    numero_salle: string,
    type_salle: string
}

export class Salle extends ElementEnCache {
    public idSalle: number;
    public numeroSalle: string;
    public typeSalle: string;

    constructor(data: SalleData) {
        super();
        this.idSalle = data.id_salle;
        this.numeroSalle = data.numero_salle;
        this.typeSalle = data.type_salle;
    }
}