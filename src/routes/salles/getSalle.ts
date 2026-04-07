import { salleCache } from "../../cache/salles/SalleCache";
import { APISalle } from "../../contracts/salles";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getSalle(code: string): Promise<APISalle> {
    
    if(code === undefined) {
        throw new ErreurRequeteInvalide("Le code de salle n'est pas valide.");
    }

    const salle = await salleCache.getOrFetch(code);
    if(!salle) {
        throw new ErreurRequeteInvalide("La salle demandée n'existe pas.");
    }

    return salle.toJSON();
}