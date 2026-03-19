import { sessionCache } from "../../../../cache/sessions/SessionCache";
import { DepotsManager } from "../../../../core/lecture/DepotsManager";
import { ErreurRequeteInvalide } from "../../../erreursApi";
import { Fichier } from "../../../useFile";

const FORMATS_ACCEPTES = ['image/jpeg', 'image/png', 'application/pdf', 'application/zip', 'application/x-rar-compressed'];

/**
 * Créer un dépôt de lecture pour une épreuve donnée, et renvoit l'ID du dépôt créé.
 * @param id 
 * @param codeEpreuve 
 * @param fichiers 
 * @returns 
 */
export async function postUploadDepot(id: string, codeEpreuve: string, fichiers: Fichier[] | unknown): Promise<number> {
    const idSession = parseInt(id ?? '');

    if (isNaN(idSession) || id === undefined)
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");

    const session = await sessionCache.getOrFetch(idSession);
    if (!session)
        throw new ErreurRequeteInvalide("La session n'existe pas.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (!epreuve)
        throw new ErreurRequeteInvalide("L'épreuve n'existe pas.");

    // Vérifier si le fichier à bien été reçu
    if (!fichiers || !Array.isArray(fichiers))
        throw new ErreurRequeteInvalide("Aucun fichier n'a été reçu.");

    // Vérifier que les fichiers soient bien au format attendu
    for (const fichier of fichiers) {
        if (!('mimetype' in fichier) || !FORMATS_ACCEPTES.includes(fichier.mimetype)) {
            throw new ErreurRequeteInvalide(`Format de fichier non accepté : ${fichier.originalname} (${fichier.mimetype}). Formats acceptés : ${FORMATS_ACCEPTES.join(', ')}.`);
        }
    }

    return DepotsManager.creerDepot(idSession, codeEpreuve, fichiers);

}