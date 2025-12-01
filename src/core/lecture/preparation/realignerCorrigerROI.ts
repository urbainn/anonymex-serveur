import { Mat } from "@techstark/opencv-js";
import { OpenCvInstance } from "../../services/OpenCvInstance";

type Pt = [number, number];
type CvModule = typeof import("@techstark/opencv-js");

type QuadCandidate = {
    idx: number;
    parentIdx: number;
    points: Pt[];
    area: number;
};

type InnerQuadSelection = {
    points: [Pt, Pt, Pt, Pt];
    ratio: number;
    mean: number;
    idx: number;
};

/**
 * Trouver le cadre dans la ROI et extraire son contenu corrigé en perspective (homographie).
 * @param roiMat Matrice opencv de la ROI, contenant le cadre (padding)
 * @returns Matrice opencv de la ROI extraite et corrigée en perspective
 */
export async function extraireROI(roiMat: Mat): Promise<Mat> {
    const cv = await OpenCvInstance.getInstance();

    // greyscale + flou et seuillage pour binariser l'image
    const gris = new cv.Mat();
    cv.cvtColor(roiMat, gris, cv.COLOR_BGR2GRAY);
    const ktaille = new cv.Size(5, 5);
    cv.GaussianBlur(gris, gris, ktaille, 0);

    // algorithme de Canny pour détecter les contours
    // https://docs.opencv.org/4.x/da/d22/tutorial_py_canny.html
    const canny = new cv.Mat();
    cv.Canny(gris, canny, 50, 150);

    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    cv.dilate(canny, canny, kernel);
    kernel.delete();

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(canny, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    canny.delete();
    const hierarchyData = hierarchy.data32S;

    const roiArea = roiMat.rows * roiMat.cols;
    const quadris: QuadCandidate[] = []; // quadrilatères détectés -- potentiels cadres

    for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const peri = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);

        if (approx.rows === 4) {
            const area = Math.abs(cv.contourArea(approx));
            if (area > roiArea * 0.02) {
                const parentIdx = hierarchyData[i * 4 + 3] ?? -1;
                quadris.push({
                    idx: i,
                    parentIdx,
                    points: matToPoints(cv, approx),
                    area
                });
            }
        }
        approx.delete();
        contour.delete();
    }

    contours.delete();
    hierarchy.delete();

    if (quadris.length === 0) {
        gris.delete();
        throw new Error("Aucun cadre détecté dans la ROI");
    }

    const outer = choisirCadreExterieur(quadris);
    const outerOrdered = orderQuadPoints(outer.points);
    const outerDims = calculerDimensions(outerOrdered);

    const innerSelection = trouverCadreInterieur(cv, gris, quadris, outer);
    let quad: [Pt, Pt, Pt, Pt];
    let selectionType: "inner" | "inset" | "outer";

    if (innerSelection) {
        quad = innerSelection.points;
        selectionType = "inner";
    } else {
        const insetPx = calculerInsetFallback(outerDims);
        const generated = generateInsetQuad(cv, outerOrdered, outerDims, insetPx);
        quad = generated ?? outerOrdered;
        selectionType = generated ? "inset" : "outer";
    }

    let dimensions = calculerDimensions(quad);
    const minDimThreshold = Math.max(12, Math.round(Math.min(outerDims.width, outerDims.height) * 0.2));
    if (selectionType !== "outer" && (dimensions.width < minDimThreshold || dimensions.height < minDimThreshold)) {
        quad = outerOrdered;
        dimensions = outerDims;
        selectionType = "outer";
    }

    const padding = Math.max(1, Math.round(Math.min(dimensions.width, dimensions.height) * 0.01));
    const paddedWidth = dimensions.width + padding * 2;
    const paddedHeight = dimensions.height + padding * 2;

    const srcMat = pointsToMat(cv, quad);
    const dstMat = pointsToMat(cv, [
        [padding, padding],
        [padding + dimensions.width - 1, padding],
        [padding, padding + dimensions.height - 1],
        [padding + dimensions.width - 1, padding + dimensions.height - 1]
    ]);

    const perspective = cv.getPerspectiveTransform(srcMat, dstMat);
    const size = new cv.Size(paddedWidth, paddedHeight);
    const dst = new cv.Mat(size.height, size.width, roiMat.type());

    cv.warpPerspective(roiMat, dst, perspective, size, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255));

    srcMat.delete();
    dstMat.delete();
    perspective.delete();
    gris.delete();

    return dst;
}

function matToPoints(cv: CvModule, mat: Mat): Pt[] {
    const points: Pt[] = [];
    const type = mat.type();

    if (type === cv.CV_32FC2) { // float32
        const data = mat.data32F;
        for (let i = 0; i < data.length; i += 2) {
            points.push([data[i]!, data[i + 1]!]);
        }
        return points;
    }

    if (type === cv.CV_64FC2) { // float64
        const data = mat.data64F;
        for (let i = 0; i < data.length; i += 2) {
            points.push([data[i]!, data[i + 1]!]);
        }
        return points;
    }

    // CV_32SC2 ou autre (representation entière)
    const data32S = mat.data32S;
    for (let i = 0; i < data32S.length; i += 2) {
        points.push([data32S[i]!, data32S[i + 1]!]);
    }
    return points;
}

function orderQuadPoints(points: Pt[]): [Pt, Pt, Pt, Pt] {
    if (points.length !== 4) {
        throw new Error("orderQuadPoints attend exactement 4 points");
    }

    const sortedByX = [...points].sort((a, b) => a[0] - b[0]);
    const leftMost = sortedByX.slice(0, 2).sort((a, b) => a[1] - b[1]);
    const rightMost = sortedByX.slice(2).sort((a, b) => a[1] - b[1]);

    const tl = leftMost[0]!;
    const bl = leftMost[1]!;
    const tr = rightMost[0]!;
    const br = rightMost[1]!;

    return [tl, tr, bl, br];
}

function pointsToMat(cv: CvModule, pts: Pt[]): Mat {
    const data = new Float32Array(pts.flat());
    return cv.matFromArray(4, 1, cv.CV_32FC2, data);
}

function calculerDimensions(points: [Pt, Pt, Pt, Pt]) {
    const [tl, tr, bl, br] = points;
    const widthA = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
    const widthB = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
    const heightA = Math.hypot(tr[0] - br[0], tr[1] - br[1]);
    const heightB = Math.hypot(tl[0] - bl[0], tl[1] - bl[1]);
    return {
        width: Math.max(1, Math.round(Math.max(widthA, widthB))),
        height: Math.max(1, Math.round(Math.max(heightA, heightB)))
    } as const;
}

function choisirCadreExterieur(candidates: QuadCandidate[]): QuadCandidate {
    // Renvoie le quadrilatère avec la plus grande aire parmi les candidats de niveau supérieur (sans parent)
    const topLevel = candidates.filter(c => c.parentIdx === -1);
    const pool = topLevel.length ? topLevel : candidates;
    pool.sort((a, b) => b.area - a.area);
    return pool[0]!;
}

function trouverCadreInterieur(cv: CvModule, gris: Mat, candidates: QuadCandidate[], outer: QuadCandidate): InnerQuadSelection | null {
    const MIN_RATIO = 0.35;
    const MAX_RATIO = 0.96;
    const MIN_MEAN = 160;

    const children = candidates
        .filter(c => c.parentIdx === outer.idx)
        .sort((a, b) => b.area - a.area);

    for (const child of children) {
        const ratio = child.area / outer.area;
        if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
            continue;
        }

        const mean = meanIntensity(cv, gris, child.points);
        if (mean < MIN_MEAN) {
            continue;
        }

        return {
            points: orderQuadPoints(child.points),
            ratio,
            mean,
            idx: child.idx
        };
    }

    return null;
}

function meanIntensity(cv: CvModule, gray: Mat, points: Pt[]): number {
    const mask = cv.Mat.zeros(gray.rows, gray.cols, cv.CV_8UC1);
    const contour = pointsToIntMat(cv, points);
    const contours = new cv.MatVector();
    contours.push_back(contour);
    cv.fillPoly(mask, contours, new cv.Scalar(255));
    const meanScalar = cv.mean(gray, mask);
    const value = Array.isArray(meanScalar) ? (meanScalar[0] ?? 0) : (meanScalar as number);
    mask.delete();
    contour.delete();
    contours.delete();
    return value;
}

function pointsToIntMat(cv: CvModule, pts: Pt[]): Mat {
    const mat = new cv.Mat(pts.length, 1, cv.CV_32SC2);
    for (let i = 0; i < pts.length; i++) {
        mat.intPtr(i, 0)[0] = Math.round(pts[i]![0]);
        mat.intPtr(i, 0)[1] = Math.round(pts[i]![1]);
    }
    return mat;
}

function calculerInsetFallback(dimensions: { width: number; height: number }): number {
    const base = Math.min(dimensions.width, dimensions.height);
    return Math.max(4, Math.round(base * 0.04));
}

function generateInsetQuad(cv: CvModule, outer: [Pt, Pt, Pt, Pt], dims: { width: number; height: number }, insetPx: number): [Pt, Pt, Pt, Pt] | null {
    const maxInsetX = Math.max(1, Math.floor((dims.width - 2) / 2));
    const maxInsetY = Math.max(1, Math.floor((dims.height - 2) / 2));
    const inset = Math.min(insetPx, maxInsetX, maxInsetY);
    if (inset < 1) {
        return null;
    }

    const rectMat = pointsToMat(cv, [
        [0, 0],
        [dims.width - 1, 0],
        [0, dims.height - 1],
        [dims.width - 1, dims.height - 1]
    ]);
    const outerMat = pointsToMat(cv, outer);
    const rectToOuter = cv.getPerspectiveTransform(rectMat, outerMat);

    const innerRect = pointsToMat(cv, [
        [inset, inset],
        [dims.width - 1 - inset, inset],
        [inset, dims.height - 1 - inset],
        [dims.width - 1 - inset, dims.height - 1 - inset]
    ]);

    const transformed = new cv.Mat();
    cv.perspectiveTransform(innerRect, transformed, rectToOuter);
    const points = matToPoints(cv, transformed);

    rectMat.delete();
    outerMat.delete();
    rectToOuter.delete();
    innerRect.delete();
    transformed.delete();

    if (points.length !== 4) {
        return null;
    }

    return orderQuadPoints(points);
}