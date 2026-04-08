import { APIEpreuve, APIListEpreuves, EpreuveStatut } from "../../../contracts/epreuves";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../erreursApi";
import { EpreuveCache } from "../../../cache/epreuves/EpreuveCache";

export async function getEpreuves(sessionId: string): Promise<APIListEpreuves> {
    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);

    if (session === undefined) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuvesBrutes = await session.epreuves.getAll();

    if (epreuvesBrutes === undefined) {
        throw new ErreurRequeteInvalide("Impossible de récupérer les épreuves de la session demandée.");
    }

    // test!!
    const epreuves = session.epreuves.serialize();
    console.log(`EPREUVES SERIALISEES (taille ${epreuves.length} bytes, soit environ ${Math.round(epreuves.length / 1024)} KB) :`, epreuves);

    const epr = EpreuveCache.deserialize(epreuves);
    for (const epreuve of epr) {
        console.log(epreuve.nom, epreuve.statut, epreuve.nbPresents, epreuve.dateEpreuve, epreuve.duree);
    }

    const now = Date.now();
    const epreuvesAvenir: APIEpreuve[] = [];
    const epreuvesPassees: APIEpreuve[] = [];

    // TEMP = forcer 50% des épreuves a etres passées, 50% à venir
    let i = 0;

    for (const epreuve of epreuvesBrutes) {
        i++;
        const luck = Math.random();
        const dateEpreuve = new Date(now + (i % 2 === 0 ? 1 : -1) * Math.floor(((Math.random() * 10) + 1) * 24 * 3600 * 1000)); // entre 1 et 10 jours dans le passé ou le futur
        const minuteSlot = Math.floor(Math.random() * 17) * 30; // de 08:00 a 16:00, par tranche de 30 min
        dateEpreuve.setHours(8 + Math.floor(minuteSlot / 60), minuteSlot % 60, 0, 0);
        epreuve.dateEpreuve = dateEpreuve.getTime();
        if (i % 2 === 0) epreuve.statut = luck > 0.5 ? EpreuveStatut.MATERIEL_NON_IMPRIME : EpreuveStatut.MATERIEL_IMPRIME;
        else epreuve.statut = luck > 0.5 ? EpreuveStatut.EN_ATTENTE_DE_DEPOT : luck > 0.15 ? EpreuveStatut.DEPOT_COMPLET : EpreuveStatut.NOTE_EXPORTEES;
        if (epreuve.codeEpreuve === "HAV637VE") epreuve.statut = EpreuveStatut.EN_ATTENTE_DE_DEPOT;
        epreuve.duree = luck > 0.5 ? 120 : 180; // 2 ou 3h

        const epreuveFormatee = epreuve.toJSON();

        if (epreuve.dateEpreuve >= now) {
            epreuvesAvenir.push(epreuveFormatee);
        } else {
            epreuvesPassees.push(epreuveFormatee);
        }
    }

    return {
        epreuvesAvenir: /*TEMP SORT: TODO: RETIRER!!!!!!*/epreuvesAvenir.sort((a, b) => a.date - b.date),
        epreuvesPassees: /*idem*/epreuvesPassees.sort((a, b) => b.date - a.date)
    };
}