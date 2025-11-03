import sharp from "sharp";
import { detecterAprilTags } from "./detecterAprilTags";
import { ScanData } from "./extraireScans";
import { obtenirOrientation } from "./obtenirOrientation";
import { ErreurDetectionAprilTags } from "../lectureErreurs";

/**
 * Prépare et ajuste le scan (découpage, rotation, ...).
 * @param scanProps Propriétés brutes du scan.
 * @param buffer Buffer de l'image brute.
 */
export async function preparerScan(scanProps: ScanData, buffer: Uint8ClampedArray | Uint8Array): Promise<boolean> {

    // Transformer l'image dans un format lisible par les outils de traitement d'images
    const scan = scanProps.raw ? sharp(buffer, {
        raw: {
            width: scanProps.width,
            height: scanProps.height,
            channels: scanProps.channels
        }
    }) : sharp(buffer);

    // Libérer la mémoire du scan brut
    buffer = new Uint8Array(0);

    // Reconnaissance des april tags.
    const detections = await detecterAprilTags(scanProps, scan)
        .catch((err) => { throw ErreurDetectionAprilTags.assigner(err) });

    // Orienter correctement le document
    const orientation = obtenirOrientation(scanProps, detections);

    return true;

}