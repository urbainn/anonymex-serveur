import sharp from "sharp";
import { Mat } from "@techstark/opencv-js";
import { LayoutPosition } from "../../generation/bordereau/modules/ModulesBordereau";
import { dimensionsFormats } from "../lireBordereau";
import { OpenCvInstance } from "../../services/OpenCvInstance";
import { matToSharp } from "../../../utils/imgUtils";


export interface DecouperROIsOptions {
    /** Marge supplémentaire appliquée autour de la ROI lors de la découpe (en mm) */
    paddingMm?: number;
}

/**
 * Découper les régions d'intérêt (ROIs) dans le scan fourni.
 * @param image Image sharp du scan.
 * @param rois Liste des régions d'intérêt à découper.
 * @param onDecoupe Callback appelé pour chaque ROI extrait, attend que la promesse soit résolue avant de continuer.
 */
export async function decouperROIs(
    documentMat: Mat,
    rois: LayoutPosition[],
    diametreCiblesMm: number,
    margeCiblesMm: number,
    format: 'A4',
    onDecoupe: (roiImage: sharp.Sharp, index: number) => Promise<void>,
    options: DecouperROIsOptions = {}
): Promise<void> {

    const cv = await OpenCvInstance.getInstance();

    // Les dimensions/coords des ROIs sont stockés en pt PDFKIT. On doit les convertir en mm
    // On travaille ici en mm directement pour plus de simplicité.
    const toMm = (v: number) => (v * 25.4) / 72;

    const { formatWidthMm, formatHeightMm } = dimensionsFormats[format];
    const distanceBorduresCentresCiblesMm = diametreCiblesMm / 2 + margeCiblesMm;

    // permet de potentiellement modifier plus tard les marges individuellement afin d'adapter la découpe des ROIs
    const marges = {
        left: distanceBorduresCentresCiblesMm,
        right: distanceBorduresCentresCiblesMm,
        top: distanceBorduresCentresCiblesMm,
        bottom: distanceBorduresCentresCiblesMm
    };

    const imgW = documentMat.cols;
    const imgH = documentMat.rows;

    const zoneEffectiveW = formatWidthMm - marges.left - marges.right;
    const zoneEffectiveH = formatHeightMm - marges.top - marges.bottom;

    // Conversion mm -> px
    const pxPerMmX = imgW / zoneEffectiveW;
    const pxPerMmY = imgH / zoneEffectiveH;

    const paddingMm = options.paddingMm ?? -0.05;

    for (let roiIndex = 0; roiIndex < rois.length; roiIndex++) {
        const roi = rois[roiIndex]!;

        // Coordonnées converties en pixels du rectangle à découper
        const x = (toMm(roi.x) - marges.left + 0.5) * pxPerMmX;
        const y = (toMm(roi.y) - marges.top + 0.5) * pxPerMmY;
        const w = (toMm(roi.largeur) - 1) * pxPerMmX;
        const h = (toMm(roi.hauteur) - 1) * pxPerMmY;

        // Convertir le padding en pixels
        const paddingX = paddingMm * pxPerMmX;
        const paddingY = paddingMm * pxPerMmY;

        // Calculer la zone effective à découper, en s'assurant de ne pas dépasser les bords de l'image
        const left = Math.max(0, Math.floor(x - paddingX));
        const top = Math.max(0, Math.floor(y - paddingY));
        const right = Math.min(imgW, Math.ceil(x + w + paddingX));
        const bottom = Math.min(imgH, Math.ceil(y + h + paddingY));
        const widthPx = Math.max(1, right - left);
        const heightPx = Math.max(1, bottom - top);

        const rect = new cv.Rect(left, top, widthPx, heightPx);
        const roiView = documentMat.roi(rect);

        const roiSharp = matToSharp(cv, roiView); // todo: trop de conversions.. passer toute l'extraction d'un scan par sharp sans repasser par cv.Mat
        roiView.delete();

        await onDecoupe(roiSharp, roiIndex);
    }
}