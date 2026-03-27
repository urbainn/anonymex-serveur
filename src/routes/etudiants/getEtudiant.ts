import { APIEtudiant } from "../../contracts/etudiants";
import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function getEtudiant(numeroEtu: string): Promise<APIEtudiant> {

    const numeroEtudiant = parseInt(numeroEtu ?? '');

    if(isNaN(numeroEtudiant) || numeroEtudiant === undefined) {
        throw new ErreurRequeteInvalide("Le numéro étudiant est invalide.");
    }

    const etudiant = await etudiantCache.getOrFetch(numeroEtudiant);

    if(etudiant === undefined) {
        throw new ErreurRequeteInvalide("L'étudiant demandé n'existe pas.");
    }

    return etudiant;
}