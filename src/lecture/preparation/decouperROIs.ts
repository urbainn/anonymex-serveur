import sharp from "sharp";
import { LayoutPosition } from "../../generation/bordereau/modules/ModulesBordereau";
import { dimensionsFormats } from "../lireBordereau";

/**
 * Découper les régions d'intérêt (ROIs) dans le scan fourni.
 * @param image Image sharp du scan.
 * @param rois Liste des régions d'intérêt à découper.
 * @param onDecoupe Callback appelé pour chaque ROI extrait, attend que la promesse soit résolue avant de continuer.
 */
export async function decouperROIs(
    image: sharp.Sharp,
    rois: LayoutPosition[],
    tailleAprilTagsMm: number,
    margeAprilTagsMm: number,
    format: 'A4',
    onDecoupe: (roiImage: sharp.Sharp, index: number) => Promise<void>
): Promise<void> {

    // Les dimensions/coords des ROIs sont stockés en pt PDFKIT. On doit les convertir en mm
    // On travaille ici en mm directement pour plus de simplicité.
    const toMm = (v: number) => (v * 25.4) / 72;

    // Calculer la taille effective du document (une fois coupé et réaligné, en coupant les AprilTags)
    // La zone effective commence à l'extrêmité du rectangle intérieur de l'AprilTag, soit 7/9 de la taille de l'AprilTag.
    const { formatWidthMm, formatHeightMm } = dimensionsFormats[format];
    const distanceBorduresZoneEffective = margeAprilTagsMm + (tailleAprilTagsMm * (7 / 9));

    // permet de potentiellement modifier plus tard les marges individuellement afin d'adapter la découpe des ROIs
    const marges = {
        left: distanceBorduresZoneEffective,
        right: distanceBorduresZoneEffective,
        top: distanceBorduresZoneEffective,
        bottom: distanceBorduresZoneEffective
    };

    const metadatas = await image.metadata();
    const imgW = metadatas.width!;
    const imgH = metadatas.height!;

    const zoneEffectiveW = formatWidthMm - marges.left - marges.right;
    const zoneEffectiveH = formatHeightMm - marges.top - marges.bottom;

    // Conversion mm -> px
    const pxPerMmX = imgW / zoneEffectiveW;
    const pxPerMmY = imgH / zoneEffectiveH;

    for (let roiIndex = 0; roiIndex < rois.length; roiIndex++) {
        const roi = rois[roiIndex]!;

        // Coordonnées converties en pixels du rectangle à découper
        const x = (toMm(roi.x) - marges.left + 0.5) * pxPerMmX;
        const y = (toMm(roi.y) - marges.top + 0.5) * pxPerMmY;
        const w = (toMm(roi.largeur) - 1) * pxPerMmX;
        const h = (toMm(roi.hauteur) - 1) * pxPerMmY;

        // Découper la ROI (floor afin d'éviter de sortir du cadre)
        const roiImage = image.clone().extract({ left: Math.floor(x), top: Math.floor(y), width: Math.floor(w), height: Math.floor(h) });
        await onDecoupe(roiImage, roiIndex);
    }
}