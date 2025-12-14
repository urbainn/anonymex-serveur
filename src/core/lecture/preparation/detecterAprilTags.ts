import sharp from "sharp";
import type { AprilTagDetection } from "@monumental-works/apriltag-node";
import { ScanData } from "./extraireScans";
import { visualiserTagDetection } from "../../../core/debug/visualiseurs/visualiserTagDetection";
import { StatistiquesDebug } from "../../../core/debug/StatistiquesDebug";
import { EtapeLecture } from "../../../core/debug/EtapesDeTraitementDicts";
import { ErreurDetectionAprilTags } from "../lectureErreurs";
import { AprilTagInstance } from "../../../core/services/AprilTagInstance";

type CoordinateTransform = "flip-vertical" | "rotate-cw-90";

/**
 * Détecte les april tags dans le scan fourni et retourne leurs positions (point central, angle).
 * @param scan 
 */
export async function detecterAprilTags(scan: ScanData, imageSharp: sharp.Sharp): Promise<AprilTagDetection[]> {

    const tempsDebut = Date.now();

    // J'ai fait une erreur toute bête lors de l'impression des tags, ils sont flip / miroirés en Y
    // donc on doit corriger ça temporairement à la détection en faisant un flip vertical + rotation 90°
    const flip = true;
    const transforms: CoordinateTransform[] = [];

    const imageDetec = imageSharp.clone().grayscale();

    if (flip) {
        transforms.push("flip-vertical", "rotate-cw-90");
        imageDetec.flip().rotate(90);
    }

    const imgGris = await imageDetec
        .raw()
        .toBuffer({ resolveWithObject: true });


    const aprilTag = await AprilTagInstance.getInstance();
    const detections = await aprilTag.detectAsync(imgGris.info.width, imgGris.info.height, imgGris.data);

    const remapPoint = createPointRemapper(transforms, imgGris.info.width, imgGris.info.height);
    const correctedDetections: AprilTagDetection[] = detections.map((detection) => ({
        ...detection,
        center: remapPoint(detection.center),
        corners: detection.corners.map((corner) => remapPoint(corner))
    }));

    // Enregistrer le temps d'exécution
    StatistiquesDebug.ajouterTempsExecution(EtapeLecture.DETECTION_CIBLES, Date.now() - tempsDebut);

    // Visualiser les détections
    if (scan.debug) await visualiserTagDetection(imageSharp, correctedDetections);

    if (correctedDetections.length <= 2) {
        throw new ErreurDetectionAprilTags("Nombre d'april tags insuffisant pour aligner correctement le scan.");
    }

    return correctedDetections;

}

// fonction extraite d'un utilitaire SHARP temporairement stationné ici le temps de corriger l'impression des tags
function createPointRemapper(
    transforms: CoordinateTransform[],
    finalWidth: number,
    finalHeight: number
) {
    if (transforms.length === 0) {
        return (point: [number, number]): [number, number] => [point[0], point[1]];
    }

    return (point: [number, number]): [number, number] => {
        let x = point[0];
        let y = point[1];
        let currentWidth = finalWidth;
        let currentHeight = finalHeight;

        for (let i = transforms.length - 1; i >= 0; i--) {
            const transform = transforms[i];

            if (transform === "rotate-cw-90") {
                const previousWidth = currentHeight;
                const previousHeight = currentWidth;

                const newX = y;
                const newY = previousHeight - 1 - x;

                x = newX;
                y = newY;
                currentWidth = previousWidth;
                currentHeight = previousHeight;
                continue;
            }

            if (transform === "flip-vertical") {
                const previousHeight = currentHeight;

                const newX = x;
                const newY = previousHeight - 1 - y;

                x = newX;
                y = newY;
                continue;
            }
        }

        return [x, y];
    };
}
