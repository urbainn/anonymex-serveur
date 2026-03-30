import { Mat } from "@techstark/opencv-js";
import { ScanData } from "./extraireScans";
import { realignerCorrigerScan } from "./realignerCorrigerScan";
import { detecterCiblesConcentriques } from "./detecterCiblesConcentriques";
import { orientationCiblesConcentriques } from "./reorientation/orientationCiblesConcentriques";
import { remapperCiblesConcentriques } from "./reorientation/remapperCiblesConcentriques";
import { OpenCvInstance } from "../../services/OpenCvInstance";

/**
 * Prépare et ajuste le scan (découpage, rotation, ...).
 * @param scanProps Propriétés brutes du scan.
 * @param buffer Buffer de l'image brute.
 * @returns Image Mat OpenCV du scan prêt à être utilisé.
 */
export async function preparerScan(scanProps: ScanData, buffer: Uint8ClampedArray | Uint8Array): Promise<Mat> {

    // transformer le buffer en Mat OpenCV
    const scan = new Mat(scanProps.height, scanProps.width, scanProps.channels === 1 ? 0 : (scanProps.channels === 3 ? 16 : 24));
    scan.data.set(buffer);

    // Libérer la mémoire du scan brut
    // eslint-disable-next-line no-useless-assignment
    buffer = new Uint8Array(0);

    const detectionCibles = await detecterCiblesConcentriques(scanProps, scan, { tailleCibleMm: 8 });
    const orientationDeg = orientationCiblesConcentriques(detectionCibles);

    if (orientationDeg === -1) {
        // TODO!!! à réimplémenter proprement en tant que fallback si cibles concentriques illisibles
        // Reconnaissance des april tags.
        //const detectionsAprilTags = await detecterAprilTags(scanProps, scan)
        //    .catch((err) => { throw ErreurDetectionAprilTags.assigner(err) });

        // Orienter correctement le document
        //const { orientation, ordreTags } = orientationAprilTags(scanProps, detectionsAprilTags);
        throw new Error('cibles concentriques illisibles.');
    }

    // Appliquer la rotation nécessaire pour réorienter le scan
    const cv = await OpenCvInstance.getInstance();
    const centreRotation = new cv.Point(scanProps.width / 2, scanProps.height / 2);
    const matriceRotation = cv.getRotationMatrix2D(centreRotation, orientationDeg, 1);
    cv.warpAffine(scan, scan, matriceRotation, new cv.Size(scanProps.width, scanProps.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

    console.log(`Rotation appliquée: ${orientationDeg}°`);

    // Remapper les détections d'april tags en fonction de la rotation appliquée
    //const detectionsRemap = remapperDetections(detectionsAprilTags, orientation, scanProps.width, scanProps.height);

    const detectionsRemap = remapperCiblesConcentriques(detectionCibles, orientationDeg, scanProps.width, scanProps.height);

    // Scan prêt : réaligner et corriger le scan
    const scanPret = await realignerCorrigerScan(scan, detectionsRemap, {
        tailleCiblesMm: 6,
        margeCiblesMm: 7,
        format: 'A4'
    });

    return scanPret;

}