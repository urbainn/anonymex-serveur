import { APIEpreuve, APIListEpreuves, EpreuveStatut } from "../../../contracts/epreuves";
import { sessionCache } from "../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../erreursApi";

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

    const now = Date.now();
    const epreuvesAvenir: APIEpreuve[] = [];
    const epreuvesPassees: APIEpreuve[] = [];

    // TEMP = forcer 50% des épreuves a etres passées, 50% à venir
    let i = 0;
    const salles = ["36.01", "36.02", "36.03", "36.04", "36.05", "5.102", "5.103", "5.104", "5.105", "5.106", "5.01", "5.02", "5.03", "5.04", "5.05", "Dumontet", "SC16.01", "SC16.02", "SC16.03", "SC16.04", "SC16.05"];

    for (const epreuve of epreuvesBrutes) {
        i++;
        const luck = Math.random();
        epreuve.dateEpreuve = now + (i % 2 === 0 ? -1 : 1) * Math.floor(((Math.random() * 10) + 1) * 24 * 3600 * 1000); // entre 1 et 10 jours dans le passé ou le futur
        if (i % 2 === 0) epreuve.statut = luck > 0.5 ? EpreuveStatut.MATERIEL_NON_IMPRIME : EpreuveStatut.MATERIEL_IMPRIME;
        else epreuve.statut = luck > 0.5 ? EpreuveStatut.EN_ATTENTE_DE_DEPOT : luck > 0.15 ? EpreuveStatut.DEPOT_COMPLET : EpreuveStatut.NOTE_EXPORTEES;
        const sallesStart = Math.floor(Math.random() * salles.length / 2);
        epreuve.salles = salles.slice(sallesStart, sallesStart + Math.floor(Math.random() * 3) + 1);
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