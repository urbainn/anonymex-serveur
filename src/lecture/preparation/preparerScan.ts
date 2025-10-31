import sharp, { Sharp } from "sharp";

/**
 * Prépare et ajuste le scan (découpage, rotation, ...).
 * @param scanBrut Scan à préparer. Données en 3 canaux (RGB).
 */
export async function preparerScan(scanBrut: ImageData): Promise<Sharp> {

    // Transformer l'image dans un format lisible par les outils de traitement d'images
    const scan = sharp(scanBrut.data, {
        raw: {
            width: scanBrut.width,
            height: scanBrut.height,
            channels: 3
        }
    });

    // Reconnaissance des april tags.
    return scan;

}