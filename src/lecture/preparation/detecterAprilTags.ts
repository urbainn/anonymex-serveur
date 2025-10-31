import sharp, { Sharp } from "sharp";

/**
 * Détecte les april tags dans le scan fourni et retourne leurs positions (point central, angle).
 * @param scan 
 */
export function detecterAprilTags(scan: Sharp) {

    // Transformer le scan en niveaux de gris pour la détection
    const scanGrey = null;
}