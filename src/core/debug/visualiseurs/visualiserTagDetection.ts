import { AprilTagDetection } from "@monumental-works/apriltag-node";
import { sharp2canvas } from "../../../utils/debugImageUtils";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import type { Sharp } from "sharp";

export async function visualiserTagDetection(image: Sharp, detections: AprilTagDetection[]): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    for (const detection of detections) {
        // contour du tag
        const corners = detection.corners;
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (let i = 0; i < corners.length; i++) {
            const corner = corners[i]!;
            if (i === 0) {
                ctx.moveTo(corner[0], corner[1]);
            } else {
                ctx.lineTo(corner[0], corner[1]);
            }
        }
        ctx.closePath();
        ctx.stroke();

        const centreX = detection.center[0];
        const centreY = detection.center[1];

        // contours/géométrie du document 
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(centreX, centreY);
        for (const autreDetection of detections) {
            if (autreDetection !== detection) {
                const autreCentreX = autreDetection.center[0];
                const autreCentreY = autreDetection.center[1];
                ctx.lineTo(autreCentreX, autreCentreY);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // Dessiner l'id au centre du tag
        ctx.fillStyle = 'red';
        ctx.font = '900 27px Arial';
        ctx.fillText(detection.id.toString(), centreX - 20, centreY - 20);

    }

    // Enregistrer l'image
    await LecturePipelineDebug.enregistrerImageDebug(EtapeLecture.DETECTION_CIBLES, canvas.toBuffer('image/jpeg'));

}