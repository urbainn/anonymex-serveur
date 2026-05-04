import sharp from "sharp";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import { sharp2canvas } from "../../../utils/debugImageUtils";
import { CibleConcentriqueDetection } from "../../lecture/preparation/detecterCiblesConcentriques";

type Pt = [number, number];

/**
 * Visualise les cibles détectées, la hiérarchie et l'estimation de la géométrie du document.
 * @param image
 * @param detectionsCibles cibles detectées
 * @param contours tous les contours détectés
 */
export async function visualiserGeometrieCibles(image: sharp.Sharp, detectionsCibles: (null | CibleConcentriqueDetection)[]): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    // Dessiner les cibles détectées + géométrie
    ctx.fillStyle = 'green';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;

    for (const groupe of detectionsCibles) {

        if (!groupe) continue;
        const pt: Pt = groupe.centre;

        if (pt) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 8, 0, 2 * Math.PI);
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