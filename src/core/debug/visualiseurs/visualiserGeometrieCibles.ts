import sharp from "sharp";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import { sharp2canvas } from "../../../utils/debugImageUtils";
import { CibleConcentriqueDetection } from "../../lecture/preparation/detecterCiblesConcentriques";

type Pt = [number, number];

export async function visualiserGeometrieCibles(image: sharp.Sharp, detectionsCibles: CibleConcentriqueDetection[]): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    // Dessiner les points d'ancrage SOURCE
    ctx.fillStyle = 'green';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;

    for (const groupe of detectionsCibles) {

        const pt: Pt = groupe.center;

        if (pt) {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 3, 0, 2 * Math.PI);
            ctx.fill();

            // cercle autour du point
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], groupe.radiusPx, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.closePath();

            // tracer des lignes entre les points
            // tracer des lignes vers les autres points du même groupe
            for (const autre of detectionsCibles) {
                if (autre && autre !== groupe) {
                    ctx.moveTo(pt[0], pt[1]);
                    ctx.lineTo(autre.center[0], autre.center[1]);
                }
            }

            ctx.stroke();
            ctx.closePath();
        }
    }

    // Enregistrer l'image
    await LecturePipelineDebug.enregistrerImageDebug(EtapeLecture.DETECTION_CIBLES, canvas.toBuffer('image/jpeg'));

}