import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { APIBoolResponse } from "../../../../contracts/common";
import { EpreuveStatut } from "../../../../contracts/epreuves";

export async function postConvocationPresents(sessionId: string, epreuveCode: string, presents: unknown | undefined): Promise<APIBoolResponse & { statut: EpreuveStatut }> {

    const idSession = parseInt(sessionId ?? '');

    const nbPresents = parseInt(presents?.toString() ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    if (isNaN(nbPresents) || nbPresents < 0) {
        throw new ErreurRequeteInvalide("Le nombre de presents est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    // Mettre à jour le statut si besoin (SAISIE_PRESENCE -> EN_ATTENTE_DE_DEPOT)
    if (epreuve.statut === EpreuveStatut.SAISIE_PRESENCE) {
        epreuve.changerStatut(EpreuveStatut.EN_ATTENTE_DE_DEPOT);
    }

    // Dépôt complet si le nombre de présents saisi correspond au nombre de copies déposées
    if (epreuve.convocations.nbDepots === nbPresents) {
        epreuve.changerStatut(EpreuveStatut.DEPOT_COMPLET);
    }

    const update = await session.epreuves.update(epreuveCode, { nb_presents: nbPresents, statut: epreuve.statut });
    epreuve.nbPresents = nbPresents; // Mettre à jour le cache

    return { success: update.affectedRows > 0, statut: epreuve.statut };
}
