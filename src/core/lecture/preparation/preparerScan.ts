import sharp from "sharp";
import { Mat } from "@techstark/opencv-js";
import { detecterAprilTags } from "./detecterAprilTags";
import { ScanData } from "./extraireScans";
import { orientationAprilTags } from "./reorientation/orientationAprilTags";
import { ErreurDetectionAprilTags } from "../lectureErreurs";
import { realignerCorrigerScan } from "./realignerCorrigerScan";
import { detecterCiblesConcentriques } from "./detecterCiblesConcentriques";
import { orientationCiblesConcentriques } from "./reorientation/orientationCiblesConcentriques";
import { remapperCiblesConcentriques } from "./reorientation/remapperCiblesConcentriques";

/**
 * Prépare et ajuste le scan (découpage, rotation, ...).
 * @param scanProps Propriétés brutes du scan.
 * @param buffer Buffer de l'image brute.
 */
export async function preparerScan(scanProps: ScanData, buffer: Uint8ClampedArray | Uint8Array): Promise<Mat> {

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

    const detectionCibles = await detecterCiblesConcentriques(scanProps, scan);
    const orientationDeg = orientationCiblesConcentriques(detectionCibles);

    if (orientationDeg === -1) {
        // TODO!!! à réimplémenter proprement en tant que fallback si cibles concentriques illisibles
        // Reconnaissance des april tags.
        const detectionsAprilTags = await detecterAprilTags(scanProps, scan)
            .catch((err) => { throw ErreurDetectionAprilTags.assigner(err) });

        // Orienter correctement le document
        const { orientation, ordreTags } = orientationAprilTags(scanProps, detectionsAprilTags);
    }

    scan.rotate(orientationDeg);
    console.log(`Rotation appliquée: ${orientationDeg}°`);

    // Remapper les détections d'april tags en fonction de la rotation appliquée
    //const detectionsRemap = remapperDetections(detectionsAprilTags, orientation, scanProps.width, scanProps.height);

    const detectionsRemap = remapperCiblesConcentriques(detectionCibles, orientationDeg);

    // Scan prêt : réaligner et corriger le scan
    const scanPret = await realignerCorrigerScan(scan, ordreTags, detectionsRemap, {
        tailleTagsMm: 10,
        margeTagsMm: 10,
        format: 'A4'
    });

    return scanPret;

}