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

    const imageDetec = imageSharp.clone().grayscale();

    const imgGris = await imageDetec
        .raw()
        .toBuffer({ resolveWithObject: true });


    const aprilTag = await AprilTagInstance.getInstance();
    const detections = await aprilTag.detectAsync(imgGris.info.width, imgGris.info.height, imgGris.data);

    // Enregistrer le temps d'exécution
    StatistiquesDebug.ajouterTempsExecution(EtapeLecture.DETECTION_CIBLES, Date.now() - tempsDebut);

    // Visualiser les détections
    if (scan.debug) await visualiserTagDetection(imageSharp, detections);

    return detections;
}
