import { ErreurRequeteInvalide } from "../erreursApi";
import { salleCache } from "../../cache/salles/SalleCache";

export async function deleteSalle(code: string): Promise<{ success: boolean }> {

    if (code === undefined) {
        throw new ErreurRequeteInvalide("Le code de salle n'est pas valide.");
    }

    const suppressionSalle = await salleCache.delete(code);

    return {
        success: suppressionSalle.affectedRows > 0
    }
}