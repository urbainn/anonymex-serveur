import { ResultSetHeader } from "mysql2";
import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Salle, SalleData } from "./Salle";

export class SalleCache extends DatabaseCacheBase<number /*idSalle*/, Salle, SalleData> {

    nomTable: string = "salle";
    colonnesClePrimaire: string[] = ["id_salle"];

    private cacheNom = new Map<string, Salle>();

    fromDatabase(data: SalleData): Salle {
        return new Salle(data);
    }

    getComposanteCache(element: Salle): number {
        return element.idSalle;
    }

    public async getParNom(nom: string): Promise<Salle | null>{
        await this.getAll();
        return this.cacheNom.get(nom)??null;
    }
    
    override set(id: number, value: Salle): void {
        super.set(id, value);
        this.cacheNom.set(value.numeroSalle, value);
    }

    override delete(id: number): Promise<ResultSetHeader> {
        const salle = this.get(id);
        if(salle) this.cacheNom.delete(salle.numeroSalle);
        return super.delete(id);
    }

    override clear(): void {
        super.clear();
        this.cacheNom.clear();
    }
}

export const salleCache = new SalleCache();