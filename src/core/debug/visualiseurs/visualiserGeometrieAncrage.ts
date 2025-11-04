import sharp from "sharp";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import { sharp2canvas } from "../../../utils/debugImageUtils";

type Pt = [number, number];

export async function visualiserGeometrieAncrage(image: sharp.Sharp, ptsAncrageSource: (Pt | null)[], ptsAncrageDest: (Pt | null)[]): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    // Dessiner les points d'ancrage SOURCE
    ctx.lineWidth = 2;

    for (const groupe of [ptsAncrageSource, ptsAncrageDest]) {
        const estSource = groupe === ptsAncrageSource;
        ctx.fillStyle = estSource ? 'red' : 'green';
        ctx.strokeStyle = estSource ? 'red' : 'green';

        console.log("Groupe de points d'ancrage:", groupe);
        for (const pt of groupe) {
            if (pt) {
                ctx.beginPath();
                ctx.arc(pt[0], pt[1], 10, 0, 2 * Math.PI);
                ctx.fill();

                // tracer des lignes entre les points
                // tracer des lignes vers les autres points du même groupe
                for (const autre of groupe) {
                    if (autre && autre !== pt) {
                        ctx.moveTo(pt[0], pt[1]);
                        ctx.lineTo(autre[0], autre[1]);
                    }
                }

                ctx.stroke();
                ctx.closePath();
            }
        }
    }

    ctx.font = '900 20px Arial';
    ctx.fillStyle = 'red';
    ctx.fillText("[X] Géométrie source", 20, 30);
    ctx.fillStyle = 'green';
    ctx.fillText("[X] Géométrie modèle", canvas.width - ctx.measureText("[X] Géométrie modèle").width - 20, 30);

    // Enregistrer l'image
    await LecturePipelineDebug.enregistrerImageDebug(EtapeLecture.CALCULER_GEOMETRIE_ANCRAGE, canvas.toBuffer('image/jpeg'));

}