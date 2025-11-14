import { DatabaseCacheBase } from "../base/DatabaseCacheBase";
import { Session, SessionData } from "./Session";

export class SessionCache extends DatabaseCacheBase<number /*id*/, Session, SessionData>{

    nomTable: string = "session_examen";
    colonnesClePrimaire: string[] = ["id_session"];

    fromDatabase(data: SessionData): Session {
        return new Session(data);
    }

    getValeursClePrimaire(element: Session): number {
        return element.id;
    }

}

export const sessionCache = new SessionCache();