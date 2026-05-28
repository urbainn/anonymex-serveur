import { Mat } from "@techstark/opencv-js";
import { decouperROIs } from "../preparation/decouperROIs";
import { ModeleBordereau } from "../../generation/bordereau/modeleBordereau";
import { CvType, OpenCvInstance } from "../../services/OpenCvInstance";
import { DIAMETRE_CIBLES_MM, MARGE_CIBLES_MM } from "../lireBordereaux";
import { matToBuffer } from "../../../utils/imgUtils";
import { TesseractOCR } from "../OCR/TesseractOCR";
import { TensorFlowCNN } from "../CNN/TensorFlowCNN";
import { config } from "../../../config";
import * as tf from "@tensorflow/tfjs-node";

interface LectureCaseCodeAnonymat {
    cnn: { caractere: string, confiance: number };
    ocr: { caractere: string, confiance: number };
}

export async function lireCodeAnonymat(scanPret: Mat): Promise<(LectureCaseCodeAnonymat | null)[]> {
    const cv = await OpenCvInstance.getInstance();
    const codeLu: (LectureCaseCodeAnonymat | null)[] = [];

    // Découper les lettres du code d'anonymat, et les lire
    const roisCodeAno = ModeleBordereau.getPositionsCadresAnonymat();
    await decouperROIs(scanPret, roisCodeAno, DIAMETRE_CIBLES_MM, MARGE_CIBLES_MM, "A4",
        async (roiAnonymat) => {

            // Pré-processing de la ROI
            if (roiAnonymat.rows <= 0 || roiAnonymat.cols <= 0) {
                roiAnonymat.delete();
                codeLu.push(null);
                return;
            }

            const imagesPretraitees = preprocessRoiEmnistOpenCv(cv, roiAnonymat);
            if (!imagesPretraitees) {
                roiAnonymat.delete();
                codeLu.push(null);
                return;
            }

            const [roiEmnistTensor, roiEmnistMat] = imagesPretraitees;

            try {

                const roiBuffer = await matToBuffer(cv, roiEmnistMat);

                // Interroger l'OCR
                const { text, confidence } = await TesseractOCR.interroger(roiBuffer);

                // Interroger la CNN
                const prediction = await TensorFlowCNN.predire(roiEmnistTensor, 'EMNIST-Standard', config.codesAnonymat.alphabetCodeAnonymat);

                codeLu.push({
                    ocr: { caractere: text.trim(), confiance: confidence },
                    cnn: { caractere: prediction.caractere, confiance: prediction.confiance }
                });

            } finally {
                roiEmnistTensor.dispose();
                roiEmnistMat.delete();
                roiAnonymat.delete();
            }

        });

    return codeLu;
}

/**
 * Prétraitement pour la lecture des caractères manuscrits : 
 */
export function preprocessRoiEmnistOpenCv(cv: CvType, roiMat: Mat): [tf.Tensor4D, Mat] | null {
    if (roiMat.rows <= 0 || roiMat.cols <= 0) {
        return null;
    }

    const gray = new cv.Mat();
    const denoised = new cv.Mat();
    const binaryInv = new cv.Mat(); 
    const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(3, 3));

    try {
        const channels = roiMat.channels();
        if (channels === 1) {
            roiMat.copyTo(gray);
        } else if (channels === 3) {
            cv.cvtColor(roiMat, gray, cv.COLOR_BGR2GRAY);
        } else if (channels === 4) {
            cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);
        } else {
            throw new Error(`Canaux ROI non supportés pour EMNIST: ${channels}`);
        }

        cv.medianBlur(gray, denoised, 3);
        cv.threshold(denoised, binaryInv, 210, 255, cv.THRESH_BINARY_INV);
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_OPEN, kernel);
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_CLOSE, kernel);

        const rowMass = new Array<number>(binaryInv.rows).fill(0);
        const colMass = new Array<number>(binaryInv.cols).fill(0);
        let totalMass = 0;

        for (let y = 0; y < binaryInv.rows; y++) {
            const row = binaryInv.row(y);
            const count = cv.countNonZero(row);
            rowMass[y] = count;
            totalMass += count;
            row.delete();
        }

        for (let x = 0; x < binaryInv.cols; x++) {
            const col = binaryInv.col(x);
            const count = cv.countNonZero(col);
            colMass[x] = count;
            col.delete();
        }

        const minInkMass = Math.max(8, Math.round((binaryInv.rows * binaryInv.cols) * 0.002));
        if (totalMass < minInkMass) {
            return null;
        }

        const maxRowMass = Math.max(...rowMass, 0);
        const maxColMass = Math.max(...colMass, 0);
        const rowThreshold = Math.max(2, Math.round(maxRowMass * 0.08));
        const colThreshold = Math.max(2, Math.round(maxColMass * 0.08));

        let top = 0;
        while (top < rowMass.length && (rowMass[top] ?? 0) < rowThreshold) top++;

        let bottom = rowMass.length - 1;
        while (bottom > top && (rowMass[bottom] ?? 0) < rowThreshold) bottom--;

        let left = 0;
        while (left < colMass.length && (colMass[left] ?? 0) < colThreshold) left++;

        let right = colMass.length - 1;
        while (right > left && (colMass[right] ?? 0) < colThreshold) right--;

        const focused = new cv.Mat();
        if (totalMass > 0 && right > left && bottom > top) {
            const rect = new cv.Rect(left, top, right - left + 1, bottom - top + 1);
            const roiFocused = binaryInv.roi(rect);
            roiFocused.copyTo(focused);
            roiFocused.delete();
        } else {
            binaryInv.copyTo(focused);
        }

        const outputSize = 28;
        const padding = 4; 
        const innerSize = outputSize - (2 * padding);

        const scale = Math.min(innerSize / focused.cols, innerSize / focused.rows);
        const resizedW = Math.max(1, Math.round(focused.cols * scale));
        const resizedH = Math.max(1, Math.round(focused.rows * scale));

        const output = new cv.Mat(outputSize, outputSize, cv.CV_8UC1, new cv.Scalar(0));
        const ocrOutput = new cv.Mat(outputSize, outputSize, cv.CV_8UC1, new cv.Scalar(255));
        const resizedGlyph = new cv.Mat();
        let returnedOcrOutput = false;

        try {
            cv.resize(focused, resizedGlyph, new cv.Size(resizedW, resizedH), 0, 0, cv.INTER_AREA);

            const x = Math.floor((outputSize - resizedW) / 2);
            const y = Math.floor((outputSize - resizedH) / 2);
            const dstRoi = output.roi(new cv.Rect(x, y, resizedW, resizedH));
            resizedGlyph.copyTo(dstRoi);
            dstRoi.delete();

            cv.bitwise_not(output, ocrOutput);

            const data = Float32Array.from(output.data);
            const tensor = tf.tidy(() => {
                let t = tf.tensor3d(data, [outputSize, outputSize, 1]);
                t = t.div(255.0);
                t = t.transpose([1, 0, 2]);
                return t.expandDims(0) as tf.Tensor4D;
            }) as tf.Tensor4D;

            returnedOcrOutput = true;
            return [tensor, ocrOutput];
        } finally {
            resizedGlyph.delete();
            focused.delete();
            output.delete();
            if (!returnedOcrOutput) {
                ocrOutput.delete();
            }
        }
    } finally {
        gray.delete();
        denoised.delete();
        binaryInv.delete();
        kernel.delete();
    }
}
