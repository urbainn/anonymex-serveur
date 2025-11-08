import { AprilTagDetection } from "@monumental-works/apriltag-node";
import sharp from "sharp";
import { ErreurRealignement } from "../lectureErreurs";
import { visualiserGeometrieAncrage } from "../../../core/debug/visualiseurs/visualiserGeometrieAncrage";
import { visualiserRegionsOfInterests } from "../../../core/debug/visualiseurs/visualiserRegionsOfInterests";
import { CadreEtudiantBenchmarkModule } from "../../generation/bordereau/modules/cadre-etudiant/CadreEtudiantBenchmarkModule";
import { OpenCvInstance } from "../../../core/services/OpenCvInstance";
import { dimensionsFormats } from "../lireBordereau";

type Pt = [number, number];

export type realignerCorrigerOptions = {
    tailleTagsMm: number;
    margeTagsMm: number;
    format: 'A4';
    /* Type de transformation à utilier si un coin est manquant (estimer puis appliquer une homographie, ou une transformation affine avec 3 points) */
    //type?: "homographieParEstimation" | "affine";
};

export async function realignerCorrigerScan(image: sharp.Sharp, ordreTags: (number | null)[], detections: AprilTagDetection[], options: realignerCorrigerOptions): Promise<sharp.Sharp> {
    const { tailleTagsMm, margeTagsMm, format } = options;
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

    // Construit un tableau de lookup rapide des tags par id
    // ID -> données de détection
    const tagLookup = new Map<number, AprilTagDetection>();
    for (const detection of detections) {
        tagLookup.set(detection.id, detection);
    }

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

    for (let i = 0; i < ordreTags.length; i++) {
        const tagId = ordreTags[i]!;

        // Calculer la position du tag attendu dans le document modèle
        const dstPt = calculerPositionTagDansModele(i, margeTagsMm, tailleTagsMm, formatWidthMm, formatHeightMm);
        dstPoints[i] = mmToPixels(dstPt);

        // Si le tag à été détecté, récuperer sa pos dans l'image source
        if (tagId !== null) {
            const detection = tagLookup.get(tagId);
            if (detection) {
                const srcPt = trouverPointAncrage(detection, imgWidth, imgHeight);
                srcPoints[i] = srcPt;
            }
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

    // On transforme l'image en instance sharp
    const outData = new Uint8ClampedArray(dstMatImg.data.buffer, dstMatImg.data.byteOffset, dstMatImg.total() * dstMatImg.elemSize());
    const imageOut = sharp(outData, {
        raw: {
            width: dstMatImg.cols,
            height: dstMatImg.rows,
            channels: dstMatImg.channels() as any
        }
    }).png();

    dstMatImg.delete();

    //TODO: a gérer proprement
    const roisGroupes = [new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getLayoutPositions().lettresCodeAnonymat]
    visualiserRegionsOfInterests(imageOut, roisGroupes);

    return imageOut;
}

/**
 * renvoit la position théorique d'un tag dans le modèle du document.
 * @param coinId 0,1,2,3 = HG, HD, BG, BD
 */
function calculerPositionTagDansModele(coinId: number, tagMarge: number, tagTaille: number, formatWidth: number, formatHeight: number): Pt {
    // Puisque le point d'ancrage est le coin intérieur du tag pointant vers le centre du document,
    // ses distances x et y aux bords du document est égale à la marge + la taille du tag.
    const margeTot = tagMarge + tagTaille;

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
            throw new ErreurRealignement(`calculerPositionTagDansModele: coinId invalide : ${coinId} / (0..3)`); // impossible sauf erreur monumentale
    }
}

/**
 * renvoit le point d'ancrage réel d'un tag (coin intérieur pointant vers le centre du document)
 * @param detection
 */
function trouverPointAncrage(detection: AprilTagDetection, imgW: number, imgH: number): Pt {
    const coins = detection.corners;

    // centre du document
    const cx = imgW / 2;
    const cy = imgH / 2;

    // coin le plus proche du centre, et sa distance
    let coinPlusProche = coins[0]!;
    let distance = Number.POSITIVE_INFINITY;

    for (const [x, y] of coins) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < distance) {
            distance = d2;
            coinPlusProche = [x, y];
        }
    }

    return coinPlusProche;
}