import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Serialiseur } from "../base/Serialiseur";
import { Salle, SalleData } from "./Salle";

export class SalleCache extends DatabaseCacheBase<string /*codeSalle*/, Salle, SalleData> {

    nomTable = "salle";
    colonnesClePrimaire: string[] = ["code_salle"];

    static serialiseur = new Serialiseur<SalleData>([
        { nom: 'code_salle', type: 'string' },
        { nom: 'libelle_salle', type: 'string' },
        { nom: 'code_batiment', type: 'string' },
        { nom: 'libelle_batiment', type: 'string' }
    ]);

    fromDatabase(data: SalleData): Salle {
        return new Salle(data);
    }

    getComposanteCache(element: Salle): string {
        return element.codeSalle;
    }

    serialize(): Buffer {
        const buffers: Buffer[] = [];
        for (const salle of this.values()) {
            buffers.push(SalleCache.serialiseur.serialize(salle.toData()));
        }

        return Buffer.concat(buffers);
    }

    public static deserialize(buffer: Buffer): Salle[] {
        const res = this.serialiseur.deserializeMany(buffer);
        return res.map(data => new Salle(data));
    }

}

export const salleCache = new SalleCache();