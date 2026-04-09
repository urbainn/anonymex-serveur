import { Mat } from "@techstark/opencv-js";
import { ModeleBordereau } from "../generation/bordereau/modeleBordereau";
import { ErreurNoteNonLue, ErreurResultatLu } from "./lectureErreurs";
import { OpenCvInstance } from "../services/OpenCvInstance";
import { decouperROIs } from "./preparation/decouperROIs";

const MARGE_CIBLES_MM = 17;
const DIAMETRE_CIBLES_MM = 9;

// Seuil de remplissage à partir duquel on considère une case comme noircie (valeur entre 0 et 1)
const SEUIL_CASE_ACTIVE = 0.14;

// difference max de taux de remplissage entre les deux cases les plus remplies pour considérer la lecture non ambiguë
const MARGE_AMBIGUITE = 0.10;

/**
 * Renvoie la note lue sur la grille de notation. En cas d'erreur de lecture, throw une ErreurGrilleNote.
 * @param matDoc
 */
export async function lireGrilleNote(matDoc: Mat): Promise<number> {

    const positions = ModeleBordereau.getPositionsCasesNote();
    const cv = await OpenCvInstance.getInstance();

    const gray = new cv.Mat();
    const normalized = new cv.Mat();
    const blurred = new cv.Mat();
    const binaryInv = new cv.Mat();
    const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));

    const noteScores = new Array(positions.notes.length).fill(0);
    const fractionScores = new Array(positions.fractions.length).fill(0);
    let erreurScore = 0;

    const scoreRemplissage = (roiMat: Mat): number => {
        const h = roiMat.rows;
        const w = roiMat.cols;
        if (h < 3 || w < 3) return 0;

        const nonZero = cv.countNonZero(roiMat);
        const total = w * h;
        return total > 0 ? nonZero / total : 0;
    };

    const extraireScores = async (rois: typeof positions.notes, target: number[]) => {
        await decouperROIs(binaryInv, rois, DIAMETRE_CIBLES_MM, MARGE_CIBLES_MM, "A4",
            async (roi, index) => {
                try {
                    // Pour chaque case, évaluer le 'score de remplissage'
                    target[index] = scoreRemplissage(roi);
                } finally {
                    roi.delete();
                }
            },
            { paddingMm: -0.2 }
        );
    };

    try {
        const channels = matDoc.channels();
        if (channels === 1) {
            matDoc.copyTo(gray);
        } else if (channels === 3) {
            cv.cvtColor(matDoc, gray, cv.COLOR_BGR2GRAY);
        } else if (channels === 4) {
            cv.cvtColor(matDoc, gray, cv.COLOR_RGBA2GRAY);
        } else {
            throw new ErreurResultatLu(`Nombre de canaux non supporté pour la lecture de note: ${channels}`);
        }

        // Pipeline dédiée cases grisées: normalisation + seuillage local + nettoyage.
        cv.normalize(gray, normalized, 0, 255, cv.NORM_MINMAX);
        cv.GaussianBlur(normalized, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
        cv.adaptiveThreshold(
            blurred,
            binaryInv,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY_INV,
            31,
            8
        );
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_OPEN, kernel);
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_CLOSE, kernel);

        await extraireScores(positions.notes, noteScores);
        await extraireScores(positions.fractions, fractionScores);

        await decouperROIs(
            binaryInv,
            [positions.caseErreur],
            DIAMETRE_CIBLES_MM,
            MARGE_CIBLES_MM,
            "A4",
            async (roi) => {
                try {
                    erreurScore = scoreRemplissage(roi);
                } finally {
                    roi.delete();
                }
            },
            { paddingMm: -0.2 }
        );

        if (erreurScore >= SEUIL_CASE_ACTIVE) {
            throw new ErreurResultatLu("Case 'Erreur' noircie sur la grille de note.");
        }

        const classes = noteScores
            .map((score, index) => ({ score, index }))
            .sort((a, b) => b.score - a.score);

        const top1 = classes[0];
        const top2 = classes[1] ?? { score: 0, index: -1 };

        if (!top1 || top1.score < SEUIL_CASE_ACTIVE) {
            throw new ErreurNoteNonLue(`Aucune case de note noircie détectée.`);
        }

        if (top1.score - top2.score < MARGE_AMBIGUITE) {
            throw new ErreurResultatLu(`Lecture ambiguë : plusieurs cases de note noircies détectées.`);
        }

        const noteEntiere = top1.index;

        const fractionsActives = fractionScores
            .map((score, index) => ({ score, index }))
            .filter(({ score }) => score >= SEUIL_CASE_ACTIVE)
            .sort((a, b) => b.score - a.score);

        if (fractionsActives.length > 1) {
            throw new ErreurResultatLu("Lecture ambiguë : plusieurs cases de fraction sont noircies.");
        }

        const fraction = fractionsActives.length === 1
            ? [0.25, 0.5, 0.75][fractionsActives[0]?.index ?? 0] ?? 0 : 0;

        return noteEntiere + fraction;

    } finally {
        gray.delete();
        normalized.delete();
        blurred.delete();
        binaryInv.delete();
        kernel.delete();
    }

}