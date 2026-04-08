import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Serialiseur } from "../base/Serialiseur";
import { EtudiantData, Etudiant } from "./Etudiant";

export class EtudiantCache extends DatabaseCacheBase<number /*numero*/, Etudiant, EtudiantData> {

    nomTable = "etudiant";
    colonnesClePrimaire: string[] = ["numero_etudiant"];

    static serialiseur = new Serialiseur<EtudiantData>([
        { nom: 'numero_etudiant', type: 'uint64' },
        { nom: 'nom', type: 'string' },
        { nom: 'prenom', type: 'string' }
    ]);

    fromDatabase(data: EtudiantData): Etudiant {
        return new Etudiant(data);
    }

    getComposanteCache(element: Etudiant): number {
        return element.numeroEtudiant;
    }

    serialize(): Buffer {
        const buffers: Buffer[] = [];
        for (const etudiant of this.values()) {
            buffers.push(EtudiantCache.serialiseur.serialize(etudiant.toData()));
        }

        return Buffer.concat(buffers);
    }

    public static deserialize(buffer: Buffer): Etudiant[] {
        const res = this.serialiseur.deserializeMany(buffer);
        return res.map(data => {
            data.numero_etudiant = Number(data.numero_etudiant); // convertir en bigint (todo: string préférable?)
            return new Etudiant(data);
        });
    }

}

export const etudiantCache = new EtudiantCache();

