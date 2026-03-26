import { Etudiant } from "../../cache/etudiants/Etudiant";
import { etudiantCache } from "../../cache/etudiants/EtudiantCache";
import { EtudiantSchema } from "../../contracts/etudiants";
import { ErreurRequeteInvalide } from "../erreursApi";

export async function postEtudiant(data: Record<string, unknown>): Promise<{ success: boolean }> {

    const nouvelEtudiant = EtudiantSchema.parse(data);

    const numeroEtudiant = nouvelEtudiant.numeroEtudiant;

    if(isNaN(numeroEtudiant) || numeroEtudiant === undefined) {
        throw new ErreurRequeteInvalide("Le numéro étudiant est invalide.");
    }

    const verificationDoublon = await etudiantCache.getOrFetch(numeroEtudiant);
    if(verificationDoublon != undefined) {
        throw new ErreurRequeteInvalide("Un étudiant possède déjà ce numéro étudiant.");
    }
    

    const etudiantData = {
        numero_etudiant: nouvelEtudiant.numeroEtudiant,
        nom: nouvelEtudiant.nom,
        prenom: nouvelEtudiant.prenom
    }

    const res = await etudiantCache.insert(etudiantData);
    const etudiant = new Etudiant(etudiantData);
    etudiantCache.set(res.insertId, etudiant);

    return { success: res.affectedRows > 0}
}