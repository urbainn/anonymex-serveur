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

    const cv = await OpenCvInstance.getInstance();
    const channels = scanProps.channels;

    // Transformer le buffer en Mat OpenCV
    const cvType = channels === 1 ? cv.CV_8UC1 : (channels === 3 ? cv.CV_8UC3 : cv.CV_8UC4);
    let scan = new cv.Mat(scanProps.height, scanProps.width, cvType);
    const dataLengthAttendue = scanProps.width * scanProps.height * channels;
    if (buffer.length < dataLengthAttendue) {
        scan.delete();
        throw new Error(`Buffer image invalide: taille reçue ${buffer.length}, attendu au moins ${dataLengthAttendue}.`);
    }
    scan.data.set(buffer.subarray(0, dataLengthAttendue));

    let scanTransmis = false;
    try {
        // Passer en couleurs BGR (si nécessaire)
        if (channels === 4) {
            const scanBGR = new cv.Mat();
            cv.cvtColor(scan, scanBGR, cv.COLOR_RGBA2BGR);
            scan.delete();
            scan = scanBGR;
        } else if (channels === 1) {
            const scanBGR = new cv.Mat();
            cv.cvtColor(scan, scanBGR, cv.COLOR_GRAY2BGR);
            scan.delete();
            scan = scanBGR;
        }

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
        const centreRotation = new cv.Point(scanProps.width / 2, scanProps.height / 2);
        const matriceRotation = cv.getRotationMatrix2D(centreRotation, orientationDeg, 1);
        try {
            cv.warpAffine(scan, scan, matriceRotation, new cv.Size(scanProps.width, scanProps.height), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));
        } finally {
            matriceRotation.delete();
        }

        // Remapper les détections d'april tags en fonction de la rotation appliquée
        //const detectionsRemap = remapperDetections(detectionsAprilTags, orientation, scanProps.width, scanProps.height);

        const detectionsRemap = remapperCiblesConcentriques(detectionCibles, orientationDeg, scanProps.width, scanProps.height);

        // Scan prêt : réaligner et corriger le scan
        scanTransmis = true;
        const scanPret = await realignerCorrigerScan(scan, detectionsRemap, {
            tailleCiblesMm: 6,
            margeCiblesMm: 7,
            format: 'A4'
        });

        return scanPret;
    } finally {
        if (!scanTransmis) {
            scan.delete();
        }
    }

}