import sharp, { Sharp } from "sharp";
import { detecterAprilTags } from "./detecterAprilTags";
import { ScanData } from "./extraireScans";

/**
 * Prépare et ajuste le scan (découpage, rotation, ...).
 * @param scanBrut Scan à préparer. Données en 3 canaux (RGB).
 */
export async function preparerScan(scanBrut: ScanData): Promise<boolean> {

    // Transformer l'image dans un format lisible par les outils de traitement d'images
    /* const scan = sharp(scanBrut.data, {
        raw: {
            width: scanBrut.width,
            height: scanBrut.height,
            channels: 3
        }
    }); */

    // Reconnaissance des april tags.
    await detecterAprilTags(scanBrut);
    return true;

}