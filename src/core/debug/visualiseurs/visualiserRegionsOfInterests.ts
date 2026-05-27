import sharp from "sharp";
import { sharp2canvas } from "../../../utils/debugImageUtils";
import { LecturePipelineDebug } from "../LecturePipelineDebug";
import { EtapeLecture } from "../EtapesDeTraitementDicts";
import { dimensionsFormats } from "../../lecture/lireBordereaux";
import { LayoutPosition } from "../../generation/ModeleLectureBase";

/**
 * Dessine toutes les ROI sur l'image pour visualisation.
 */
export async function visualiserRegionsOfInterests(
    image: sharp.Sharp,
    groupesRois: LayoutPosition[][],
    {
        marginsMm = { left: 17.7, top: 17.7, right: 17.9, bottom: 17.7 }, // a mieux déterminer.....
    } = {}
): Promise<void> {
    const canvas = await sharp2canvas(image);
    const ctx = canvas.getContext("2d");

    ctx.lineWidth = 4;
    ctx.strokeStyle = "red";

    const { formatWidthMm, formatHeightMm } = dimensionsFormats.A4;
    const imgW = canvas.width;
    const imgH = canvas.height;

    const visibleWmm = formatWidthMm - marginsMm.left - marginsMm.right;
    const visibleHmm = formatHeightMm - marginsMm.top - marginsMm.bottom;

    // Conversion mm -> px
    const pxPerMmX = imgW / visibleWmm;
    const pxPerMmY = imgH / visibleHmm;
    const toMm = (v: number) => (v * 25.4) / 72;

    for (const groupe of groupesRois) {
        for (const roi of groupe) {
            const xMm = toMm(roi.x) - marginsMm.left;
            const yMm = toMm(roi.y) - marginsMm.top;
            const wMm = toMm(roi.largeur);
            const hMm = toMm(roi.hauteur);

            const xPx = xMm * pxPerMmX;
            const yPx = yMm * pxPerMmY;
            const wPx = wMm * pxPerMmX;
            const hPx = hMm * pxPerMmY;

            ctx.strokeRect(xPx - 2, yPx - 2, wPx + 4, hPx + 4);
        }
    }

    // Sauvegarde
    await LecturePipelineDebug.enregistrerImageDebug(EtapeLecture.CORRIGER_REALIGNER_SCAN, canvas.toBuffer("image/jpeg"));
}