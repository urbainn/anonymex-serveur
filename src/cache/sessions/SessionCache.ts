import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Serialiseur } from "../base/Serialiseur";
import { Session, SessionData } from "./Session";

export class SessionCache extends DatabaseCacheBase<number /*id*/, Session, SessionData> {

    nomTable = "session_examen";
    colonnesClePrimaire: string[] = ["id_session"];

    static serialiseur = new Serialiseur<SessionData>([
        { nom: 'id_session', type: 'uint16' },
        { nom: 'nom', type: 'string' },
        { nom: 'annee', type: 'uint16' },
        { nom: 'statut', type: 'uint8' },
    ]);

    fromDatabase(data: SessionData): Session {
        return new Session(data);
    }

    getComposanteCache(element: Session): number {
        return element.id;
    }

    serialize(): Buffer {
        const buffers: Buffer[] = [];
        for (const session of this.values()) {
            buffers.push(session.serialize());
        }

        return Buffer.concat(buffers);
    }

    public static deserialize(buffer: Buffer): Session[] {
        const res = this.serialiseur.deserializeMany(buffer);
        return res.map(data => new Session(data));
    }
}

export const sessionCache = new SessionCache();