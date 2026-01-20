import sharp from "sharp";
import { Mat } from "@techstark/opencv-js";
import { ErreurRealignement } from "../lectureErreurs";
import { visualiserGeometrieAncrage } from "../../../core/debug/visualiseurs/visualiserGeometrieAncrage";
import { visualiserRegionsOfInterests } from "../../../core/debug/visualiseurs/visualiserRegionsOfInterests";
import { CadreEtudiantBenchmarkModule } from "../../generation/bordereau/modules/cadre-etudiant/CadreEtudiantBenchmarkModule";
import { OpenCvInstance } from "../../../core/services/OpenCvInstance";
import { dimensionsFormats } from "../lireBordereau";
import { matToSharp } from "../../../utils/imgUtils";
import { CibleConcentriqueDetection } from "./detecterCiblesConcentriques";

type Pt = [number, number];

export type realignerCorrigerOptions = {
    /** Taille (diamètre) des cibles concentriques en millimètres */
    tailleCiblesMm: number;
    /** Marge en millimètres autour des cibles */
    margeCiblesMm: number;
    format: 'A4';
};

export async function realignerCorrigerScan(image: sharp.Sharp, detections: Array<null | CibleConcentriqueDetection>, options: realignerCorrigerOptions): Promise<Mat> {
    const { tailleCiblesMm, margeCiblesMm, format } = options;
    const { formatWidthMm, formatHeightMm } = dimensionsFormats[format];

    const cv = await OpenCvInstance.getInstance();

    // sharp -> matrice opencv
    const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const rgba = cv.matFromArray(info.height, info.width, cv.CV_8UC4,
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    const mat = new cv.Mat();
    cv.cvtColor(rgba, mat, cv.COLOR_RGBA2BGR);
    rgba.delete();

    const imgWidth = mat.cols;
    const imgHeight = mat.rows;

    // Calculer la taille de sortie du document en pixels
    const sortieH = imgHeight;
    const sortieW = Math.round((formatWidthMm / formatHeightMm) * sortieH); // Ratio format d'origine

    // fonctions utilitaires
    function mmToPixels(point: Pt): Pt {
        const ppmX = sortieW / formatWidthMm; // pixels par millimètre
        const ppmY = sortieH / formatHeightMm;
        return [point[0] * ppmX, point[1] * ppmY];
    }

    function ptsToMat32FC2(pts: Pt[]) {
        // pts = [[x0,y0],[x1,y1],[x2,y2],[x3,y3],...]
        const data = new Float32Array(pts.flat());
        // 4x1 CV_32FC2 est ce qu'opencv attend pour les points 2D
        return cv.matFromArray(4, 1, cv.CV_32FC2, data);
    }

    // Points d'ancrage SOURCE (dans l'image d'ORIGINE)
    // Il s'agit de la positions du coin INTERIEUR des tags (pointant vers le centre du document)
    // On prend ce point d'ancrage car il est plus stable que le centre du tag (flou, rotation, plus susceptible d'être coupé)
    const srcPoints: (Pt | null)[] = [null, null, null, null]; // Points d'ancrage dans l'image source
    const dstPoints: (Pt | null)[] = [null, null, null, null]; // Points d'ancrage du modèle/"théorique"

    // l'idée est, une fois que l'on a les points d'ancrage source et destination (réels/théoriques),
    // d'appliquer une transformation homographique ou affine pour réaligner le document avec ces points de correspondance.

    for (let i = 0; i < detections.length; i++) {
        const detection = detections[i];

        // Calculer la position de la cible attendue dans le document modèle
        const dstPt = calculerPositionCibleDansModele(i, margeCiblesMm, tailleCiblesMm, formatWidthMm, formatHeightMm);
        dstPoints[i] = mmToPixels(dstPt);

        // Si la cible a été détectée, récuperer sa pos dans l'image source
        if (detection) {
            const srcPt = [detection.centre[0], detection.centre[1]] as Pt;
            srcPoints[i] = srcPt;
        }

    }

    // Vérifier qu'on a au moins 3 points valides pour faire la transformation
    const srcPts = srcPoints.filter(pt => pt !== null) as Pt[];
    const dstPts = dstPoints.filter(p => p !== null) as Pt[];
    if (srcPts.length < 3) {
        throw new ErreurRealignement(`Impossible de réaligner le document, trop peu de points d'ancrage (3 nécessaires, ${srcPts.length} obtenus)`);
    }

    await visualiserGeometrieAncrage(image, srcPoints, dstPoints);

    // Ancrer le document en (0,0) pour éviter les problèmes de bord lors de la transformation
    const xs = dstPts.map(p => p[0]), ys = dstPts.map(p => p[1]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);

    const dst0 = dstPts.map(p => [p[0] - minX, p[1] - minY] as Pt);
    const size = new cv.Size(Math.round(maxX - minX), Math.round(maxY - minY));

    const srcMat = ptsToMat32FC2(srcPts);
    const dstMat = ptsToMat32FC2(dst0);

    const dstMatImg = new cv.Mat(size.height, size.width, cv.CV_8UC3);

    if (srcPts.length === 4) {
        // Homographie
        const H = cv.getPerspectiveTransform(srcMat, dstMat);
        cv.warpPerspective(mat, dstMatImg, H, size, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));

        // libérer la mémoire
        mat.delete();
        srcMat.delete();
        dstMat.delete();
        H.delete();
    } else if (srcPts.length === 3) {
        // TODO: affine ou estimation du 4e point et homographie
        throw new ErreurRealignement(`Transformation affine pas encore implémentée. Les 4 coins doivent être visibles.`);
    }

    // Visualisations debug (Sharp uniquement pour le debug)
    const roisGroupes = [new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getZonesLecture().lettresCodeAnonymat];
    const imageOutSharp = matToSharp(cv, dstMatImg);
    const margesDistanceMm = margeCiblesMm + (tailleCiblesMm / 2);
    await visualiserRegionsOfInterests(imageOutSharp, roisGroupes, { marginsMm: { left: margesDistanceMm, top: margesDistanceMm, right: margesDistanceMm, bottom: margesDistanceMm } });

    return dstMatImg;
}

/**
 * renvoit la position théorique d'une cible dans le modèle du document.
 * @param coinId 0,1,2,3 = HG, HD, BG, BD
 */
function calculerPositionCibleDansModele(coinId: number, cibleMarge: number, diametre: number, formatWidth: number, formatHeight: number): Pt {
    // renvoit les coordonnées théoriques (en mm) du centre de la cible dans le modèle du document
    const margeTot = cibleMarge + (diametre / 2);

    switch (coinId) {
        case 0: // HG
            return [margeTot, margeTot];
        case 1: // HD
            return [formatWidth - margeTot, margeTot];
        case 2: // BG
            return [margeTot, formatHeight - margeTot];
        case 3: // BD
            return [formatWidth - margeTot, formatHeight - margeTot];
        default:
            throw new ErreurRealignement(`calculerPositionCibleDansModele: coinId invalide : ${coinId} / (0..3)`); // impossible sauf erreur monumentale
    }
}