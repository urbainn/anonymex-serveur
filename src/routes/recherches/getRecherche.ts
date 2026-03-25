import * as chrono from 'chrono-node';
import {
    APIListRecherche,
    APIRechercheReponse,
    APIRechercheUE,
    APIRechercheSalle,
    TypeRecherche,
    ListRechercheSchema
} from "../../contracts/recherche";
import { Database } from "../../core/services/database/Database";

export async function getRecherche(sessionId: string, query: string): Promise<APIListRecherche> {
    const idSession = parseInt(sessionId);
    if (isNaN(idSession)) throw new Error("Session ID invalide.");

    const queryBrute = query.trim();

    let resultats: APIRechercheReponse[];

    // Recherche par UE (priorité 1)
    resultats = await Database.query<APIRechercheUE>(
        "SELECT 'UE' as type, code_epreuve as code FROM epreuve WHERE id_session = ? AND code_epreuve LIKE ?;",
        [idSession, `${queryBrute}%`]
    );

    // Recherche par date et heure (priorité 2)
    if (resultats.length === 0) {
        // On utilise chrono-node pour récupérer les informations sur la date et l'heure
        const parseDate = chrono.fr.parse(queryBrute);

        if (parseDate.length > 0) {
            const dateTrouvee = parseDate[0];

            if (dateTrouvee != undefined) {
                const dateRef = dateTrouvee.start.date();

                const horodatageMinutes = Math.floor(dateRef.getTime() / 60000).toString();

                // On extrait uniquement la salle de la chaine en supprimant les informations de la date et de l'heure
                const salleExtraite = queryBrute.replace(dateTrouvee.text, "").trim();

                if (salleExtraite.length > 0) {
                    // Tentative de recherche à partir de la salle extraite
                    const salles = await Database.query<APIRechercheSalle>(
                        "SELECT 'Salle' as type, code_salle as codeSalle FROM salle WHERE code_salle LIKE ?;",
                        [`${salleExtraite}%`]
                    );

                    if (salles.length > 0) {
                        resultats = salles.map(s => ({
                            type: TypeRecherche.SalleHeure,
                            codeSalle: s.codeSalle,
                            horodatage: horodatageMinutes
                        }));
                    }
                }

                // Si jamais aucune salle n'a pu être extraite de la chaine, alors on renvoie l'heure seule
                if (resultats.length === 0) {
                    resultats = [{
                        type: TypeRecherche.Heure,
                        horodatage: horodatageMinutes
                    }];
                }
            }

        }
    }

    // Recherche par salle (priorité 3)
    if (resultats.length === 0) {
        resultats = await Database.query<APIRechercheSalle>(
            "SELECT 'Salle' as type, code_salle as codeSalle FROM salle WHERE code_salle LIKE ?;",
            [`${queryBrute}%`]
        );
    }

    // Recherche par étudiant (priorité 4)
    if (resultats.length === 0) {
        resultats = await Database.query<APIRechercheSalle>(
            "SELECT 'Etudiant' as type, numero_etudiant as numero FROM etudiant WHERE numero_etudiant LIKE ?;",
            [`${queryBrute}%`]
        );
    }

    // Recherche par action (priorité 5)
    if (resultats.length === 0) {
        const queryAction = queryBrute.toLowerCase();

        if (queryAction.includes("télécharger") || queryAction.includes("bordereau")) {
            resultats.push({
                type: TypeRecherche.Action,
                action: 1
            });
        }

        // Action 2 : Déposer des copies
        if (queryAction.includes("déposer") || queryAction.includes("copies")) {
            resultats.push({
                type: TypeRecherche.Action,
                action: 2
            });
        }

        if (queryAction.includes("changer") || queryAction.includes("session")) {
            resultats.push({
                type: TypeRecherche.Action,
                action: 3
            });
        }
    }
    return ListRechercheSchema.parse(resultats);
}