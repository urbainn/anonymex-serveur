import sharp from "sharp";
import { ScanData } from "./extraireScans";
import { OpenCvInstance } from "../../../core/services/OpenCvInstance";
import { dimensionsFormats } from "../lireBordereau";
import { CIBLES_NB_RINGS } from "../../generation/bordereau/genererCiblesConcentriques";
import { ErreurDetectionCiblesConcentriques } from "../lectureErreurs";
import { visualiserGeometrieCibles } from "../../debug/visualiseurs/visualiserGeometrieCibles";
import { StatistiquesDebug } from "../../debug/StatistiquesDebug";
import { EtapeLecture } from "../../debug/EtapesDeTraitementDicts";

type FormatId = keyof typeof dimensionsFormats;

export type CibleConcentriqueDetection = {
    id: number;
    rings: number;
    centre: [number, number];
    rayonPx: number;
    coin: 0 | 1 | 2 | 3;
};

export type DetecterCiblesConcentriquesOptions = {
    format?: FormatId;
    tailleCibleMm?: number;
};

/** Map de lookup optimisée pour associer le nb. d'anneaux internes à l'ID de la cible */
const RING_ID_LOOKUP = new Map<number, number>(
    CIBLES_NB_RINGS.map((nbRings, idx) => [nbRings, idx])
);

export async function detecterCiblesConcentriques(
    scan: ScanData,
    imageSharp: sharp.Sharp,
    options?: DetecterCiblesConcentriquesOptions
): Promise<CibleConcentriqueDetection[]> {

    const tempsDebut = Date.now();

    const { format, tailleCibleMm } = options || {};
    const formatDims = dimensionsFormats[format ?? "A4"];

    const cv = await OpenCvInstance.getInstance();
    const { data, info } = await imageSharp.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // transformer en niveaux de gris
    const rgba = cv.matFromArray(info.height, info.width, cv.CV_8UC4,
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    const gray = new cv.Mat();
    cv.cvtColor(rgba, gray, cv.COLOR_RGBA2GRAY);
    rgba.delete();

    // flou gaussien (réduction du bruit)
    const flou = new cv.Mat();
    cv.GaussianBlur(gray, flou, new cv.Size(5, 5), 0);
    gray.delete();

    // seuillage adaptatif (binarisation)
    const seuillage = new cv.Mat();
    cv.adaptiveThreshold(flou, seuillage, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 41, 5);
    flou.delete();

    // ouverture morphologique (éliminer les petits objets)
    const opened = new cv.Mat();
    const noyau = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));
    cv.morphologyEx(seuillage, opened, cv.MORPH_OPEN, noyau);
    seuillage.delete();
    noyau.delete();

    // trouver les contours des formes dans l'image binaire
    const contours = new cv.MatVector();
    const hierarchie = new cv.Mat();
    cv.findContours(opened, contours, hierarchie, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);
    opened.delete();

    try {
        if (hierarchie.rows === 0 || hierarchie.cols === 0) {
            throw new ErreurDetectionCiblesConcentriques("Aucune cible concentrique détectée.");
        }

        const ppmX = info.width / formatDims.formatWidthMm;
        const ppmY = info.height / formatDims.formatHeightMm;
        const pixelsPerMm = (ppmX + ppmY) / 2;

        const rayonAttendu = ((tailleCibleMm ?? 5) * pixelsPerMm) / 2;
        const rayonTolereMin = rayonAttendu * 0.2;
        const rayonTolereMax = rayonAttendu * 1.2;

        const hierarchieData = hierarchie.data32S;

        // Pour chaque coin [HG, HD, BG, BD], garder la meilleure cible détectée (la plus proche du bord correspondant)
        const coinMeilleurCandidats: CibleConcentriqueDetection[] = [];

        for (let i = 0; i < contours.size(); i++) {
            const parentIdx = hierarchieData[i * 4 + 3];
            if (parentIdx !== -1) continue; // on ne veut que les formes extérieures

            const ringCount = countNestedRings(i, hierarchieData);
            const tagId = RING_ID_LOOKUP.get(ringCount);
            if (tagId === undefined) continue;

            const contour = contours.get(i);
            try {
                const circle = cv.minEnclosingCircle(contour);
                const radius = circle.radius;
                if (!isFinite(radius) || radius < rayonTolereMin || radius > rayonTolereMax) continue;

                const area = Math.abs(cv.contourArea(contour));
                const perimeter = cv.arcLength(contour, true) || 1;
                const circularity = (4 * Math.PI * area) / (perimeter * perimeter);
                if (circularity < 0.35) continue;

                const center: [number, number] = [circle.center.x, circle.center.y];

                // Trouver le coin le plus proche
                const distanceHaut = center[1];
                const distanceBas = info.height - center[1];
                const distanceGauche = center[0];
                const distanceDroite = info.width - center[0];

                const estADroite = distanceDroite < distanceGauche; // plus à droite qu'à gauche..?
                const estEnBas = distanceBas < distanceHaut; // plus en bas qu'en haut..?

                // 0: HG, 1: HD, 2: BG, 3: BD - indice du coin le plus proche
                const coinIndex: number = (estEnBas ? 2 : 0) + (estADroite ? 1 : 0);

                const candidate: CibleConcentriqueDetection = {
                    id: tagId,
                    rings: ringCount,
                    centre: center,
                    rayonPx: radius,
                };
            } finally {
                contour.delete();
            }
        }

        const detections = Array.from(bestCandidates.values()).map(({ detection }) => detection);
        detections.sort((a, b) => a.id - b.id);

        if (detections.length < RING_ID_LOOKUP.size - 1) {
            throw new ErreurDetectionCiblesConcentriques(`Détection des cibles incomplète (${detections.length}/${RING_ID_LOOKUP.size}).`);
        }

        for (const detection of detections) {
            console.log(`Cible concentrique détectée - ID: ${detection.id}, Anneaux: ${detection.rings}, Centre: (${detection.center[0].toFixed(1)}, ${detection.center[1].toFixed(1)}), Rayon(px): ${detection.radiusPx.toFixed(1)}`);
        }

        await visualiserGeometrieCibles(imageSharp, detections, contours);
        StatistiquesDebug.ajouterTempsExecution(EtapeLecture.DETECTION_CIBLES, Date.now() - tempsDebut);

        return detections;
    } finally {
        contours.delete();
        hierarchie.delete();
    }
}

function countNestedRings(index: number, hierarchy: Int32Array): number {
    let count = 1;
    let child = hierarchy[index * 4 + 2]!;
    while (child !== -1) {
        count++;
        child = hierarchy[child * 4 + 2]!;
    }
    return count;
}

type CornerIndex = 0 | 1 | 2 | 3;

function distanceToNearestEdge(center: [number, number], width: number, height: number): { distance: number; edge: CornerIndex } {
    const [cx, cy] = center;

    const distanceLeft = Math.max(0, cx);
    const distanceRight = Math.max(0, width - cx);
    const distanceTop = Math.max(0, cy);
    const distanceBottom = Math.max(0, height - cy);

    const useLeft = distanceLeft <= distanceRight;
    const useTop = distanceTop <= distanceBottom;

    const nearestHorizontal = useLeft ? distanceLeft : distanceRight;
    const nearestVertical = useTop ? distanceTop : distanceBottom;
    const distance = Math.min(nearestHorizontal, nearestVertical);

    let edge: CornerIndex;
    if (useTop) {
        edge = useLeft ? 0 : 1;
    } else {
        edge = useLeft ? 2 : 3;
    }

    return { distance, edge };
}