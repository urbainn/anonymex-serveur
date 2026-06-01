import { APIUpdateConvocation, UpdateConvocationSchema } from "../../../../contracts/convocations";
import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { EpreuveStatut } from "../../../../contracts/epreuves";

export async function patchConvocation(sessionId: string, epreuveCode: string, codeAnonymat: string, data: Record<string, unknown>): Promise<APIUpdateConvocation> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (!epreuveCode) {
        throw new ErreurRequeteInvalide("Le code de l'epreuve est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(epreuveCode);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const dataParsees = UpdateConvocationSchema.parse(data);
    
    const convocation = await epreuve.convocations.getOrFetch(codeAnonymat);

    if (!convocation) {
        throw new ErreurRequeteInvalide("La convocation demandée n'existe pas.");
    }

    if(convocation.numeroEtudiant === null) {
        throw new ErreurRequeteInvalide("Vous ne pouvez pas modifier cette convocation.");
    }
    if (dataParsees.note_quart === undefined) {
        // Note supprimée
        if (convocation.noteQuart !== undefined)
        {
            epreuve.convocations.nbDepots -= 1;
            // Changer le status de l'épreuve si le dépôt devient incomplet : passé de COMPLET à SAISIE_PRESENCE
            if (epreuve.statut === EpreuveStatut.DEPOT_COMPLET) {
                epreuve.changerStatut(EpreuveStatut.EN_ATTENTE_DE_DEPOT);
                session.epreuves.update(epreuve.codeEpreuve, { statut: EpreuveStatut.EN_ATTENTE_DE_DEPOT });
            }

        }
        convocation.noteQuart = null;
    }
    if (dataParsees.note_quart !== undefined && (dataParsees.note_quart < 0 || dataParsees.note_quart > 80)) {
        throw new ErreurRequeteInvalide("La note doit être un nombre entre 0 et 20. (En quart de points, entre 0 et 80).");
    }

    // Note ajoutée pour une convocation qui n'en avait pas encore ? (nouveau dépôt)
    if (dataParsees.note_quart !== undefined && convocation.noteQuart === null) {
        epreuve.convocations.nbDepots += 1;

        // Changer le status de l'épreuve si le dépôt est complet
        if (epreuve.depotVientDetreComplete) {
            epreuve.changerStatut(EpreuveStatut.DEPOT_COMPLET);
            session.epreuves.update(epreuve.codeEpreuve, { statut: EpreuveStatut.DEPOT_COMPLET });
        }
    }

    if (dataParsees.note_quart !== undefined) convocation.noteQuart = dataParsees.note_quart;
    if (dataParsees.rang !== undefined) convocation.rang = dataParsees.rang;
    if (dataParsees.code_salle !== undefined) convocation.codeSalle = dataParsees.code_salle;

    await epreuve.convocations.update(codeAnonymat, dataParsees);

    // Reconstruire le cache des convocations de l'épreuve pour refléter les mises à jour
    epreuve.convocations.reconstruireCache();

    return dataParsees;
}