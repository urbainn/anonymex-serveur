import { ScanData } from "./extraireScans";
import { OpenCvInstance } from "../../../core/services/OpenCvInstance";
import { dimensionsFormats } from "../lireBordereau";
import { ErreurDetectionCiblesConcentriques } from "../lectureErreurs";
import { StatistiquesDebug } from "../../debug/StatistiquesDebug";
import { EtapeLecture } from "../../debug/EtapesDeTraitementDicts";
import { Mat } from "@techstark/opencv-js";
import { CIBLES_NB_RINGS } from "../../generation/common/genererCiblesConcentriques";

type FormatId = keyof typeof dimensionsFormats;
type CoinIndice = 0 | 1 | 2 | 3;

export interface CibleConcentriqueDetection {
    id: number;
    rings: number;
    centre: [number, number];
    rayonPx: number;
    coin: CoinIndice;
}

export interface DetecterCiblesConcentriquesOptions {
    format?: FormatId;
    tailleCibleMm?: number;
}

/** Map de lookup optimisée pour associer le nb. d'anneaux internes à l'ID de la cible */
const RING_ID_LOOKUP = new Map<number, number>(
    CIBLES_NB_RINGS.map((nbRings, idx) => [nbRings, idx])
);

export async function detecterCiblesConcentriques(scan: ScanData, img: Mat, options?: DetecterCiblesConcentriquesOptions): Promise<(null | CibleConcentriqueDetection)[]> {

    const tempsDebut = Date.now();

    // Convertir le scan en buffer utilisable par OpenCV
    const cv = await OpenCvInstance.getInstance();

    // Format et dimensions
    const { format, tailleCibleMm } = options || {};
    const formatDims = dimensionsFormats[format ?? "A4"];

    // résolution en pixels par mm. Pas représentatif (approximation), surtout en cas de rognage important.
    // en clair; on suppose que l'image couvre un maximum de la surface du format attendu afin de calculer la résolution.
    // on prend en compte l'orientation, qui invertit largeur/hauteur si paysage.
    const estOrientationPaysage = scan.width >= scan.height ? true : false;
    const ppmX = scan.width / (estOrientationPaysage ? formatDims.formatHeightMm : formatDims.formatWidthMm);
    const ppmY = scan.height / (estOrientationPaysage ? formatDims.formatWidthMm : formatDims.formatHeightMm);
    const pixelsParMm = (ppmX + ppmY) / 2;

    // Position des coins dans l'image (HG, HD, BG, BD) en pixels. Non dépendant de l'orientation (permet de réorienter plus tard)
    const positionCoins = [
        [0, 0], // haut gauche
        [scan.width, 0], // haut droite
        [0, scan.height], // bas gauche
        [scan.width, scan.height]  // bas droite
    ]

    // Conversion en niveaux de gris (adaptiveThreshold exige CV_8UC1)
    const gris = new cv.Mat();
    const imgChannels = img.channels();
    if (imgChannels === 1) {
        img.copyTo(gris);
    } else if (imgChannels === 3) {
        cv.cvtColor(img, gris, cv.COLOR_BGR2GRAY);
    } else if (imgChannels === 4) {
        cv.cvtColor(img, gris, cv.COLOR_RGBA2GRAY);
    } else {
        gris.delete();
        throw new ErreurDetectionCiblesConcentriques(`Format image non supporté pour la détection des cibles (channels=${imgChannels}).`);
    }

    // flou gaussien (réduction du bruit)
    const flou = new cv.Mat();
    cv.GaussianBlur(gris, flou, new cv.Size(5, 5), 0);
    gris.delete();

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

    // Obtenir les propriétés d'un contour de cercle
    const getCercle = (contour: Mat) => {
        return {
            cercle: cv.minEnclosingCircle(contour),
            aire: Math.abs(cv.contourArea(contour)),
            perimetre: cv.arcLength(contour, true) || 1
        };
    };

    // Renvoyer la circularité d'un contour (1 = parfait cercle, 0 = ligne)
    const getCircularite = (aire: number, perimetre: number) => {
        return (4 * Math.PI * aire) / (perimetre * perimetre);
    };

    // Analyser les contours
    try {
        if (hierarchie.rows === 0 || hierarchie.cols === 0) { // hiérarchie vide
            throw new ErreurDetectionCiblesConcentriques("Aucune cible concentrique détectée.");
        }

        const rayonAttendu = (tailleCibleMm ?? 6) * pixelsParMm / 2;
        const rayonTolereMin = rayonAttendu * 0.8;
        const rayonTolereMax = rayonAttendu * 1.2;

        const hierarchieData = hierarchie.data32S;

        // Pour chaque coin [HG, HD, BG, BD], garder la meilleure cible détectée (la plus proche du bord correspondant)
        const coinMeilleurCandidats: (null | CibleConcentriqueDetection)[] = [null, null, null, null];

        for (let i = 0; i < contours.size(); i++) {
            const parentIdx = hierarchieData[i * 4 + 3];
            if (parentIdx !== -1) continue; // on ne veut que les formes extérieures

            // Compter le nombre d'anneaux imbriqués
            let imbrications = 1;
            let child = hierarchieData[i * 4 + 2];
            while (child !== -1 && child !== undefined) {
                imbrications++;
                // chercher l'enfant de l'imbrication actuelle
                child = hierarchieData[child * 4 + 2];
            }

            const tagId = RING_ID_LOOKUP.get(imbrications) ?? 0;

            const contour = contours.get(i);
            try {
                const propsCercle = getCercle(contour);
                const cercle = propsCercle.cercle;
                const circularite = getCircularite(propsCercle.aire, propsCercle.perimetre);

                if (!isFinite(cercle.radius) || cercle.radius < rayonTolereMin || cercle.radius > rayonTolereMax) continue;
                if (circularite < 0.40) continue;

                const center: [number, number] = [propsCercle.cercle.center.x, propsCercle.cercle.center.y];
                // Trouver le coin le plus proche
                const distanceHaut = center[1];
                const distanceBas = scan.height - center[1];
                const distanceGauche = center[0];
                const distanceDroite = scan.width - center[0];

                const estADroite = distanceDroite < distanceGauche; // plus à droite qu'à gauche..?
                const estEnBas = distanceBas < distanceHaut; // plus en bas qu'en haut..?

                // 0: HG, 1: HD, 2: BG, 3: BD - indice du coin le plus proche
                const coinIndex = (estEnBas ? 2 : 0) + (estADroite ? 1 : 0) as CoinIndice;

                const candidat: CibleConcentriqueDetection = {
                    id: tagId,
                    rings: imbrications,
                    centre: center,
                    rayonPx: cercle.radius,
                    coin: coinIndex
                };

                // Vérifier si il s'agit du meilleur candidat (le + proche du bord)
                const meilleurCandidatExistant = coinMeilleurCandidats[coinIndex];
                if (!meilleurCandidatExistant) {
                    coinMeilleurCandidats[coinIndex] = candidat;
                } else {
                    // Comparer les distances aux coins
                    const pointPos = positionCoins[coinIndex] as [number, number];
                    const distanceExistant = distanceCoin(meilleurCandidatExistant.centre, pointPos);
                    const distanceCandidat = distanceCoin(candidat.centre, pointPos);
                    if (distanceCandidat < distanceExistant) {
                        coinMeilleurCandidats[coinIndex] = candidat;
                    }
                }

            } finally {
                contour.delete();
            }
        }

        const nbCiblesDetectees = coinMeilleurCandidats.filter(c => c !== null).length;
        if (nbCiblesDetectees < RING_ID_LOOKUP.size - 1) {
            throw new ErreurDetectionCiblesConcentriques(`Détection des cibles incomplète (${nbCiblesDetectees}/${RING_ID_LOOKUP.size}).`);
        }

        //await visualiserGeometrieCibles(imageSharp, coinMeilleurCandidats, contours);
        StatistiquesDebug.ajouterTempsExecution(EtapeLecture.DETECTION_CIBLES, Date.now() - tempsDebut);

        return coinMeilleurCandidats;
    } finally {
        contours.delete();
        hierarchie.delete();
    }
}

/**
 * Renvoyer la distance entre un point et un coin donné
 * @param point 
 * @param coinPosition 
 * @returns
 */
function distanceCoin(point: [number, number], coinPosition: [number, number]): number {
    const dx = point[0] - coinPosition[0];
    const dy = point[1] - coinPosition[1];
    return Math.sqrt(dx * dx + dy * dy);
}