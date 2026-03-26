import * as chrono from 'chrono-node';
import { APIRechercheReponse, APIListRecherche, TypeRecherche, ListRechercheSchema } from "../../../contracts/recherches";
import { Database } from "../../../core/services/database/Database";
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';
import { salleCache } from '../../../cache/salles/SalleCache';

export async function getRecherche(sessionId: string, query: string): Promise<APIListRecherche> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession)) {
        throw new Error("L'id de la session est invalide.");
    }

    const queryBrute = query.trim(); // On récupère la recherche en supprimant les caractères parasites

    // Recherche par UE (priorité 1)
    const ues = await Database.query<{ code_epreuve: string }>(
        "SELECT code_epreuve FROM epreuve WHERE id_session = ? AND code_epreuve LIKE ?;",
        [idSession, `${queryBrute}%`]
    );

    if (ues.length > 0) {
        return {
            resultats: ues.map(ue => ({
                type: TypeRecherche.UE,
                code: ue.code_epreuve
            }))
        };
    }

    // Recherche par date et heure (priorité 2)
    const parseDate = chrono.fr.parse(queryBrute); // Utilisation de chrono-node pour récupérer et interpréter la date

    if (parseDate.length > 0 && parseDate[0]) {

        const dateTrouvee = parseDate[0];
        const dateRef = dateTrouvee.start.date();

        const horodatageMinutes = Math.floor(dateRef.getTime() / 60000).toString(); // Conversion de la date en timestamp
        const salleExtraite = queryBrute.replace(dateTrouvee.text, "").trim(); // On extrait la salle en supprimant la date trouvée de la recherche

        // Si on a trouvé une salle dans la recherche alors on fait d'abord une requête de la salle dans le cache, sinon directement à travers la query
        if (salleExtraite.length > 0) {

            const sallesEnCache = await salleCache.getOrFetch(salleExtraite);

            if (sallesEnCache != undefined) {
                return {
                    resultats: [{
                        type: TypeRecherche.SALLEHEURE,
                        codeSalle: sallesEnCache.codeSalle,
                        horodatage: horodatageMinutes
                    }]
                }
            }
            const sallesEnQuery = await Database.query<{ code_salle: string }>(
                "SELECT code_salle FROM salle WHERE code_salle LIKE ?;",
                [`${salleExtraite}%`]
            );

            if (sallesEnQuery.length > 0) {
                return {
                    resultats: sallesEnQuery.map(salle => ({
                        type: TypeRecherche.SALLEHEURE,
                        codeSalle: salle.code_salle,
                        horodatage: horodatageMinutes
                    }))
                };
            }
        }

        // Si on a une date mais pas de salle correspondante
        return {
            resultats: [{
                type: TypeRecherche.HEURE,
                horodatage: horodatageMinutes
            }]
        };
    }

    // Recherche par salle seule (priorité 3)
    const sallesSeules = await Database.query<{ code_salle: string }>(
        "SELECT code_salle FROM salle WHERE code_salle LIKE ?;",
        [`${queryBrute}%`]
    );

    if (sallesSeules.length > 0) {
        return {
            resultats: sallesSeules.map(salle => ({
                type: TypeRecherche.SALLE,
                codeSalle: salle.code_salle
            }))
        };
    }

    // Recherche par étudiant (priorité 4)
    const etudiant = await etudiantCache.getOrFetch(parseInt(queryBrute));

    if (etudiant != undefined) {
        return {
            resultats: [{
                type: TypeRecherche.ETUDIANT,
                numero: etudiant.numeroEtudiant
            }]
        };
    }

    // Recherche par action (priorité 5)
    const queryAction = queryBrute.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // On nettoie la recherche pour supprimer les accents

    const listeActions = [
        { id: 1, motsCles: ["télécharger", "bordereau"] },
        { id: 2, motsCles: ["déposer", "copies"] },
        { id: 3, motsCles: ["changer", "session"] },
    ];

    // On filtre si la saisie de l'utilisateur correspond au début d'un des mots-clés (à optimiser ?)
    const resultatsActions: APIRechercheReponse[] = listeActions
        .filter(action =>
            action.motsCles.some(mot => mot.startsWith(queryAction))
        )
        .map(action => ({
            type: TypeRecherche.ACTION,
            action: action.id
        }));

    return ListRechercheSchema.parse({ resultats: resultatsActions });
}