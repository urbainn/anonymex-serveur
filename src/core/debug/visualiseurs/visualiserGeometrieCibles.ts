import sharp from "sharp";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import { sharp2canvas } from "../../../utils/debugImageUtils";
import { CibleConcentriqueDetection } from "../../lecture/preparation/detecterCiblesConcentriques";
import { MatVector } from "@techstark/opencv-js";

type Pt = [number, number];

/**
 * Visualise les cibles détectées, la hiérarchie et l'estimation de la géométrie du document.
 * @param image
 * @param detectionsCibles cibles detectées
 * @param contours tous les contours détectés
 */
export async function visualiserGeometrieCibles(image: sharp.Sharp, detectionsCibles: Array<null | CibleConcentriqueDetection>, contours: MatVector): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    // dessiner la hiérarchie
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 0.5;

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        if (contour.rows > 0) {
            ctx.beginPath();
            for (let j = 0; j < contour.rows; j++) {
                const pointData = contour.data32S[j * 2]!; // x
                const pointDataY = contour.data32S[j * 2 + 1]!; // y
                if (j === 0) {
                    ctx.moveTo(pointData, pointDataY);
                } else {
                    ctx.lineTo(pointData, pointDataY);
                }
            }
            ctx.closePath();
            ctx.stroke();
        } contour.delete();
    }

    // Dessiner les cibles détectées + géométrie
    ctx.fillStyle = 'green';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;

    for (const groupe of detectionsCibles) {

        if (!groupe) continue;
        const pt: Pt = groupe.centre;

        if (pt) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 3, 0, 2 * Math.PI);
            ctx.fill();

            // cercle autour du point
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], groupe.rayonPx, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();

            // tracer des lignes entre les points
            // tracer des lignes vers les autres points du même groupe
            for (const autre of detectionsCibles) {
                if (autre && autre !== groupe) {
                    ctx.moveTo(pt[0], pt[1]);
                    ctx.lineTo(autre.centre[0], autre.centre[1]);
                }
            }

            ctx.stroke();
            ctx.closePath();
        }
    }

    // Enregistrer l'image
    await LecturePipelineDebug.enregistrerImageDebug(EtapeLecture.DETECTION_CIBLES, canvas.toBuffer('image/jpeg'));

}