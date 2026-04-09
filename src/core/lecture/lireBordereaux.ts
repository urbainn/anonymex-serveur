import { Fichier } from "../../routes/useFile";
import { Mat } from "@techstark/opencv-js";
import { matToSharp } from "../../utils/imgUtils";
import { OpenCvInstance } from "../services/OpenCvInstance";
import { TensorFlowCNN } from "./CNN/TensorFlowCNN";
import { Depot } from "./DepotsManager";
import { ErreurResultatLu } from "./lectureErreurs";
import { preprocessPipelines } from "./OCR/preprocessPipelines";
import { TesseractOCR } from "./OCR/TesseractOCR";
import { decouperROIs } from "./preparation/decouperROIs";
//import { detecterAprilTags } from "./preparation/detecterAprilTags";
import { extraireScans } from "./preparation/extraireScans";
import { preparerScan } from "./preparation/preparerScan";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { IncidentData } from "../../cache/epreuves/incidents/Incident";
import { config } from "../../config";
import { MediaService } from "../services/MediaService";
import { logInfo } from "../../utils/logger";
import { ModeleBordereau } from "../generation/bordereau/modeleBordereau";
import * as tf from "@tensorflow/tfjs-node";
import { CvType } from "../services/OpenCvInstance";
import { lireGrilleNote } from "./lireGrilleNote";

const MARGE_CIBLES_MM = 17;
const DIAMETRE_CIBLES_MM = 9;

export type CallbackLecture = (event: string, id: number, data: Record<string, unknown>) => void;

function preprocessRoiEmnistOpenCv(cv: CvType, roiMat: Mat): tf.Tensor3D | null {
    if (roiMat.rows <= 0 || roiMat.cols <= 0) {
        return null;
    }

    const gray = new cv.Mat();
    const denoised = new cv.Mat();
    const binaryInv = new cv.Mat();
    const binaryLetterBlack = new cv.Mat();
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
        cv.threshold(denoised, binaryInv, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_OPEN, kernel);
        cv.morphologyEx(binaryInv, binaryInv, cv.MORPH_CLOSE, kernel);
        cv.bitwise_not(binaryInv, binaryLetterBlack);

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
            const roiFocused = binaryLetterBlack.roi(rect);
            roiFocused.copyTo(focused);
            roiFocused.delete();
        } else {
            binaryLetterBlack.copyTo(focused);
        }

        const outputSize = 28;
        const padding = 2;
        const innerSize = outputSize - (2 * padding);

        const scale = Math.min(innerSize / focused.cols, innerSize / focused.rows);
        const resizedW = Math.max(1, Math.round(focused.cols * scale));
        const resizedH = Math.max(1, Math.round(focused.rows * scale));

        const output = new cv.Mat(outputSize, outputSize, cv.CV_8UC1, new cv.Scalar(255));
        const resizedGlyph = new cv.Mat();

        try {
            cv.resize(focused, resizedGlyph, new cv.Size(resizedW, resizedH), 0, 0, cv.INTER_AREA);

            const x = Math.floor((outputSize - resizedW) / 2);
            const y = Math.floor((outputSize - resizedH) / 2);
            const dstRoi = output.roi(new cv.Rect(x, y, resizedW, resizedH));
            resizedGlyph.copyTo(dstRoi);
            dstRoi.delete();

            cv.threshold(output, output, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
            const data = Float32Array.from(output.data);
            return tf.tensor3d(data, [outputSize, outputSize, 1]);
        } finally {
            output.delete();
            resizedGlyph.delete();
            focused.delete();
        }
    } finally {
        gray.delete();
        denoised.delete();
        binaryInv.delete();
        binaryLetterBlack.delete();
        kernel.delete();
    }
}

export async function lireBordereaux(fichiers: Fichier[], getDepot: () => Depot): Promise<void> {

    // Configurer tesseract
    await TesseractOCR.configurerModeCaractereUnique(config.codesAnonymat.alphabetCodeAnonymat);

    // Récupérer les positions des ROIs du modèle de bordereau
    const roisCodeAno = ModeleBordereau.getPositionsCadresAnonymat();

    // Récupérer la session et l'épreuve depuis le dépôt
    const sessionId = getDepot().sessionId;
    const codeEpreuve = getDepot().codeEpreuve;

    // Récupérer les instances
    const session = await sessionCache.getOrFetch(sessionId);
    const epreuve = await session?.epreuves.getOrFetch(codeEpreuve);
    if (!session || !epreuve) {
        getDepot().callback?.('error', 0, { message: 'Session ou épreuve introuvable' });
        return;
    }

    let numFichier = 0;
    for (const fichier of fichiers) {
        const document = { data: fichier.buffer, encoding: 'buffer', mimeType: fichier.mimetype };

        // Extraire tous les scans du document
        await extraireScans(document, async (scan, buffer) => {
            let scanPret: Mat | null = null;
            try {
                // Préparer et ajuste le scan (découpage, rotation, ...).
                scanPret = await preparerScan(scan, buffer);

                // Code lu ('' = échec de lecture)
                const codeLu: string[] = [];

                // Découper les lettres du code d'anonymat, et les lire
                await decouperROIs(scanPret, roisCodeAno, DIAMETRE_CIBLES_MM, MARGE_CIBLES_MM, "A4",
                    async (roiAnonymat) => {

                        // Pré-processing de la ROI
                        const cv = await OpenCvInstance.getInstance();
                        if (roiAnonymat.rows <= 0 || roiAnonymat.cols <= 0) {
                            roiAnonymat.delete();
                            codeLu.push('');
                            return;
                        }

                        const roiEmnistTensor = preprocessRoiEmnistOpenCv(cv, roiAnonymat);
                        if (!roiEmnistTensor) {
                            roiAnonymat.delete();
                            codeLu.push('');
                            return;
                        }

                        const roiSharp = matToSharp(cv, roiAnonymat);
                        roiAnonymat.delete();

                        const roiAnonPrete = await preprocessPipelines.initial(roiSharp.clone())
                            .resize({
                                width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
                                kernel: "lanczos3"
                            }).png().toBuffer();

                        // Interroger l'OCR
                        const { text, confidence } = await TesseractOCR.interroger(roiAnonPrete);

                        // Interroger la CNN
                        let prediction;
                        try {
                            prediction = await TensorFlowCNN.predire(roiEmnistTensor, 'EMNIST-Standard', config.codesAnonymat.alphabetCodeAnonymat);
                        } finally {
                            roiEmnistTensor.dispose();
                        }

                        //logInfo('Lecture', `CNN: ${prediction.caractere} (confiance: ${(prediction.confiance * 100).toFixed(2)}%), OCR: "${text.trim()}" (conf: ${confidence.toFixed(2)}%)`);

                        // Décider du caractère lu en fonction des résultats de l'OCR et de la CNN
                        if (prediction.caractere === text.trim()[0])
                            codeLu.push(prediction.caractere);
                        else if (prediction.confiance > 0.8)
                            codeLu.push(prediction.caractere);
                        else if (confidence > 0.7)
                            codeLu.push(text.trim()[0] ?? '');
                        else
                            codeLu.push('');

                    });

                // Lire la note
                const noteLue = await lireGrilleNote(scanPret);
                console.log("Note lue :", noteLue);

                for (let i = 0; i < codeLu.length; i++) {
                    const lettre = codeLu[i] ?? '';
                    if (i < 3) {
                        const lettreReport = codeLu[i + 3] ?? '';
                        if (lettre === '' && lettreReport === '') {
                            const codeLuPartiel = codeLu.map(c => c === '' ? '?' : c).join('');
                            throw new ErreurResultatLu('Échec de lecture du code anonymat', codeLuPartiel);
                        }
                    }
                }

                logInfo('Lecture', `Code d'anonymat lu : ${codeLu.join('')}`);

            } catch (error) {
                // Erreur lors de la lecture du bordereau : faire remonter l'erreur
                if (error instanceof ErreurResultatLu && error.incident && scanPret) {

                    // Créer un incident
                    const incidentData: Omit<IncidentData, 'id_incident'> = {
                        id_session: sessionId,
                        code_epreuve: codeEpreuve,
                        titre: error.name,
                        details: error.message,
                        code_anonymat: error.codeAnonymatLu ?? null,
                        note_quart: error.noteLue ? error.noteLue * 4 : null
                    };

                    // Insérer l'incident en base de données et en cache
                    const incidentInsert = await epreuve.incidents.insert(incidentData);
                    const incidentId = incidentInsert.insertId;
                    if (incidentInsert.affectedRows === 0 || incidentId === undefined) {
                        getDepot().callback?.('error', 0, { message: 'Erreur lors de la création d\'un incident' });
                        console.error("Erreur lors de la création de l'incident :", incidentInsert);
                        return;
                    }

                    const nvIncidentData = { ...incidentData, id_incident: incidentId };
                    const incident = epreuve.incidents.fromDatabase(nvIncidentData);
                    epreuve.incidents.set(incidentId, incident);

                    // Enregistrer le scan sur le disque
                    await MediaService.enregistrerMat(scanPret, 'incidents/', `${incidentId}.webp`);

                    logInfo('Incident', "Incident créé lors de la lecture d'un bordereau.");

                    // Remonter l'incident au client
                    getDepot().callback?.('incident', 0, incident.toJSON());

                } else if (error instanceof Error) {
                    getDepot().callback?.('error', 0, { message: error.message });
                    console.error("Erreur lors de la lecture du bordereau :", error);
                } else {
                    getDepot().callback?.('error', 0, { message: 'Erreur inconnue' });
                    console.error("Erreur inconnue lors de la lecture du bordereau :", error);
                }
            } finally {
                // Libérer la mémoire du scan préparé
                scanPret?.delete();

                numFichier++;
                getDepot().callback?.('progress', 0, { n: numFichier, t: scan.nbPages });
            }
        });
    }

    // Envoi du message de fin de lecture
    getDepot().onComplete?.();


}