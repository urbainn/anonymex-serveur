import { IncidentData } from "../../../../cache/epreuves/incidents/Incident";
import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { APIReponseCorrectionIncident } from "../../../../contracts/incidents";
import { ErreurRequeteInvalide, ErreurServeur } from "../../../erreursApi";

export async function postIncident(sessionId: string, codeEpreuve: string, incidentId: string, codeAnonymat?: string, noteQuart?: string): Promise<APIReponseCorrectionIncident> {

    const idSession = parseInt(sessionId ?? '');
    const idIncident = parseInt(incidentId ?? '');
    const quartNote = parseInt(noteQuart ?? '');

    if (isNaN(idSession) || sessionId === undefined) throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    if (isNaN(idIncident) || incidentId === undefined) throw new ErreurRequeteInvalide("L'ID d'incident n'est pas valide.");
    if (isNaN(quartNote) || noteQuart === undefined || quartNote < 0 || quartNote > 80 || quartNote !== Math.round(quartNote)) {
        throw new ErreurRequeteInvalide("La note passée n'est pas valide (entier entre 0 et 80).");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (session === undefined) throw new ErreurRequeteInvalide("La session demandée n'existe pas.");

    const epreuve = session.epreuves.get(codeEpreuve);
    if (epreuve === undefined) throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");

    const incident = await epreuve.incidents.getOrFetch(idIncident);
    if (incident === undefined) throw new ErreurRequeteInvalide("L'incident demandé n'existe pas.");

    if (codeAnonymat === undefined) throw new ErreurRequeteInvalide("Le code anonymat est requis pour corriger une copie.");
    const convocation = await epreuve.convocations.getOrFetch(codeAnonymat);
    if (convocation === undefined) {

        // Si le numéro d'anonymat n'existe pas, alors on retourne une liste vide (pas de nouvel incident).
        return {
            success: false,
            message: "Le numéro d'anonymat n'existe pas.",
            suggestions: await epreuve.incidents.suggererCodesAnonymat(codeAnonymat)
        };

    }

    // La convocation à déjà une note assignée ? (doublon !)
    // On valide la correction mais on créé un incident pour l'AUTRE copie avec le même numéro d'anonymat
    if (convocation.noteQuart !== null && convocation.noteQuart !== quartNote) {

        const incident: Omit<IncidentData, 'id_incident'> = {
            code_anonymat: codeAnonymat,
            code_epreuve: codeEpreuve,
            id_session: idSession,
            note_quart: quartNote,
            titre: "Doublon",
            details: "Deux copies ont le même numéro d'anonymat. Créé après une correction."
        }

        const nvIncidentInsert = await epreuve.incidents.insert(incident);
        const nvIncidentId = nvIncidentInsert.insertId;

        if (nvIncidentInsert.affectedRows === 0 || nvIncidentId === undefined) {
            throw new ErreurServeur("Erreur lors de la création de l'incident de doublon.");
        }

        const nvIncident = epreuve.incidents.fromDatabase({ ...incident, id_incident: nvIncidentId });
        epreuve.incidents.set(nvIncidentId, nvIncident);

        // Remplacer la copie corrigée
        convocation.noteQuart = quartNote;
        await epreuve.convocations.update(convocation.codeAnonymat, { note_quart: convocation.noteQuart });

        // Supprimer l'incident courant
        await epreuve.incidents.delete(idIncident);

        return {
            success: true,
            incidents: [nvIncident.toJSON()]
        };

    }

    // Corriger l'incident normalement
    convocation.noteQuart = quartNote;
    await epreuve.convocations.update(convocation.codeAnonymat, { note_quart: convocation.noteQuart });
    await epreuve.incidents.delete(idIncident);

    return {
        success: true
    };

};