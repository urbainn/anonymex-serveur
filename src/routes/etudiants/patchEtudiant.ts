import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { APIUpdateEtudiant, UpdateEtudiantSchema } from "../../contracts/etudiants";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function patchEtudiant(numero: string, data: Record<string, unknown>): Promise<APIUpdateEtudiant> {

    const numeroEtudiant = parseInt(numero ?? '');

    if(isNaN(numeroEtudiant) || numero === undefined) {
        throw new ErreurRequeteInvalide("Le numéro étudiant n'est pas valide.");
    }

    const etudiant = await etudiantCache.getOrFetch(numeroEtudiant);
    if(!etudiant) {
        throw new ErreurRequeteInvalide("L'étudiant passé n'existe pas.");
    }

    const dataParsees = UpdateEtudiantSchema.parse(data);
    await etudiantCache.update(numeroEtudiant, dataParsees);
    etudiantCache.get(numeroEtudiant)?.fromData(dataParsees);

    return dataParsees;
}