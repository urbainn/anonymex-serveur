import { sessionCache } from "../../../cache/sessions/SessionCache";
import { APIEpreuve } from "../../../contracts/epreuves";
import { Database } from "../../../core/services/database/Database";
import { ErreurRequeteInvalide, ErreurServeur } from "../../erreursApi";

export async function getRechercheEtudiant(sessionId: string, numero: string): Promise<APIEpreuve[]> {

    const idSession = parseInt(sessionId ?? '');
    const numeroEtudiant = parseInt(numero ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de la session est invalide.");
    }

    if (isNaN(numeroEtudiant) || numero === undefined) {
        throw new ErreurRequeteInvalide("Le numéro de l'étudiant est invalide.");
    }

    const resultats = await Database.query<{ codeEpreuve: string }>("SELECT DISTINCT e.id_session as idSession, e.code_epreuve as codeEpreuve FROM epreuve e JOIN convocation c ON e.id_session = c.id_session AND e.code_epreuve = c.code_epreuve WHERE c.id_session = ? AND c.numero_etudiant = ?;", [idSession, numeroEtudiant]);

    const session = await sessionCache.getOrFetch(idSession);

    if (!session) {
        throw new ErreurServeur(`La session d'id : ${idSession} n'existe pas.`);
    }

    await session.epreuves.getAll();

    const epreuves: APIEpreuve[] = [];

    for (const resultat of resultats) {

        const epreuve = await session.epreuves.getOrFetch(resultat.codeEpreuve);

        if (!epreuve) {
            throw new ErreurServeur(`L'épreuve de code : ${resultat.codeEpreuve} n'existe pas.`);
        }

        epreuves.push(epreuve.toJSON());
    }

    return epreuves;
}