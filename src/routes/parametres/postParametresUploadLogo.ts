import { ImagesImportsCache } from "../../cache/ImagesImportsCache";
import { ErreurRequeteInvalide } from "../erreursApi";
import { Fichier } from "../useFile";

const FORMATS_ACCEPTES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];

/**
 * Créer un dépôt de lecture pour une épreuve donnée, et renvoit l'ID du dépôt créé.
 * @param id 
 * @param codeEpreuve 
 * @param fichiers 
 * @returns 
 */
export async function postParametresUploadLogo(type: string, fichiers?: Fichier[]) {

    if (type !== "universite" && type !== "faculte")
        throw new ErreurRequeteInvalide(`Type de logo non reconnu : ${type}. Types acceptés : universite, faculte.`);

    // Vérifier si le fichier à bien été reçu
    if (!fichiers || !Array.isArray(fichiers) || !fichiers[0])
        throw new ErreurRequeteInvalide("Aucun fichier n'a été reçu.");

    // Vérifier que les fichiers soient bien au format attendu
    for (const fichier of fichiers) {
        if (!('mimetype' in fichier) || !FORMATS_ACCEPTES.includes(fichier.mimetype)) {
            throw new ErreurRequeteInvalide(`Format de fichier non accepté : ${fichier.originalname} (${fichier.mimetype}). Formats acceptés : ${FORMATS_ACCEPTES.join(', ')}.`);
        }
    }

    // Enregistrer le fichier (en remplaçant l'ancien s'il existe)
    const buffer = fichiers[0].buffer; // On prend le premier fichier (s'il y en a plusieurs, les autres sont ignorés)
    await ImagesImportsCache.enregistrerImage(type === "universite" ? "logo_universite" : "logo_faculte", buffer);

}