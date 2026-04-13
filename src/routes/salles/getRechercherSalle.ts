import { Database } from "../../core/services/database/Database";
import { APIListSalles, APISalle } from "../../contracts/salles";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getRechercherSalle(query: string): Promise<APIListSalles> {

    if (query === undefined || query.trim().length === 0) {
        throw new ErreurRequeteInvalide("Le code de salle n'est pas valide.");
    }

    const queryFiltre = query.trim();

    const salles = await Database.query<APISalle>(
        "SELECT code_salle as codeSalle, libelle_salle as libelleSalle, code_batiment as codeBatiment, libelle_batiment as libelleBatiment FROM salle WHERE code_salle LIKE ? ORDER BY code_salle ASC LIMIT 10;",
        [`%${queryFiltre}%`]
    );

    return { salles };
}