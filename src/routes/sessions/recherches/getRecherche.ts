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

    // Recherche par salle et/ou date (priorité 2 & 3)
    const parseDate = chrono.fr.parse(queryBrute)[0]; // On extrait la date grâce à chrono-node (on prend le premier résultat renvoyé)
    
    // Si jamais on a réussi à extraire une date, alors on la met de côté
    const horodatageMinutes = parseDate
        ? Math.floor(parseDate.start.date().getTime() / 60000).toString() // On transforme la date en timestamp
        : null;

    // Si une date a été trouvée, on cherche la salle sur le texte restant, si aucune date trouvée on cherche directement sur la query brute
    const salleExtraite = parseDate
        ? queryBrute.replace(parseDate.text, "").trim() // On extrait le nom de la salle en retirant la date trouvée précédement
        : queryBrute;

    let codesSalles: string[] = [];

    if (salleExtraite) {
        // Tentative de recherche via Cache
        const salleEnCache = await salleCache.getOrFetch(salleExtraite);
        if (salleEnCache) {
            codesSalles = [salleEnCache.codeSalle];
        } else {
            // Tentative de recherche via la base de données
            const sallesEnDB = await Database.query<{ code_salle: string }>(
                "SELECT code_salle FROM salle WHERE code_salle LIKE ?;",
                [`${salleExtraite}%`]
            );
            codesSalles = sallesEnDB.map(salle => salle.code_salle);
        }
    }

    // On a plusieurs cas :
    // Cas 1 : On a trouvé une salle et un horodatage
    if (codesSalles.length > 0 && horodatageMinutes) {
        return {
            resultats: codesSalles.map(code => ({
                type: TypeRecherche.SALLEHEURE,
                codeSalle: code,
                horodatage: horodatageMinutes
            }))
        };
    }

    // Cas B : On a uniquement un horodatage
    if (horodatageMinutes) {
        return {
            resultats: [{
                type: TypeRecherche.HEURE,
                horodatage: horodatageMinutes
            }]
        };
    }

    // Cas C : On a uniquement trouvé une ou des salles
    if (codesSalles.length > 0) {
        return {
            resultats: codesSalles.map(code => ({
                type: TypeRecherche.SALLE,
                codeSalle: code
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
        { id: 1, motsCles: ["telecharger", "bordereau"] },
        { id: 2, motsCles: ["deposer", "copies"] },
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