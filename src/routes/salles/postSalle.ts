import { SalleSchema } from "../../contracts/salles";
import { salleCache } from "../../cache/salles/SalleCache";

export async function postSalle(data: Record<string, unknown>): Promise<{ success: boolean }> {
    const nouvelleSalle = SalleSchema.parse(data);

    const insertionSalle = await salleCache.insert({
        code_salle: nouvelleSalle.codeSalle,
        libelle_salle: nouvelleSalle.libelleSalle,
        code_batiment: nouvelleSalle.codeBatiment,
        libelle_batiment: nouvelleSalle.libelleBatiment
    })

    return { success: insertionSalle.affectedRows > 0 }
}