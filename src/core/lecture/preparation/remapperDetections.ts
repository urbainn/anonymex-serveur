import { AprilTagDetection } from "@monumental-works/apriltag-node";
import { ErreurAlignement } from "../lectureErreurs";

/**
 * Remappe les coordonnées des détections d'april tags en fonction des transformations appliquées à l'image (suite à la réorientation).
 * @param detections Détections d'april tags avant remapping.
 * @param orientation Angle de rotation appliqué à l'image (multiple de 90°).
 * @param width Largeur de l'image après rotation.
 * @param height Hauteur de l'image après rotation.
 * @returns Nouvelles détections avec coordonnées remappées.
 */
export function remapperDetections(detections: AprilTagDetection[], orientation: number, width: number, height: number): AprilTagDetection[] {
    if (orientation % 90 !== 0) {
        throw new ErreurAlignement("L'orientation doit être un multiple de 90° pour le remapping des détections.");
    }

    const angle = ((orientation % 360) + 360) % 360; // Normaliser entre 0 et 270°
    if (angle === 0) {
        return detections; // Pas de remapping nécessaire
    }

    return detections.map(detection => {
        let remappedCenter: [number, number];
        let remappedCorners: [number, number][];

        switch (angle) {
            case 90:
                remappedCenter = [height - detection.center[1], detection.center[0]];
                remappedCorners = detection.corners.map(corner => [height - corner[1], corner[0]]);
                break;
            case 180:
                remappedCenter = [width - detection.center[0], height - detection.center[1]];
                remappedCorners = detection.corners.map(corner => [width - corner[0], height - corner[1]]);
                break;
            case 270:
                remappedCenter = [detection.center[1], width - detection.center[0]];
                remappedCorners = detection.corners.map(corner => [corner[1], width - corner[0]]);
                break;
            default:
                throw new ErreurAlignement("Angle de rotation non supporté pour le remapping des détections.");
        }

        return {
            ...detection,
            center: remappedCenter,
            corners: remappedCorners
        };
    });
}