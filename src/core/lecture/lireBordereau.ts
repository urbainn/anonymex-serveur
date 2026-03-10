import { readFileSync } from 'fs';
import { extraireScans, ScanData } from './preparation/extraireScans';
import { preparerScan } from './preparation/preparerScan';
import { decouperROIs } from './preparation/decouperROIs';
import sharp from 'sharp';
import { ErreurDecoupeROIs } from './lectureErreurs';
import { preprocessPipelines } from './OCR/preprocessPipelines';
import { TesseractOCR } from './OCR/TesseractOCR';
import { TensorFlowCNN } from './CNN/TensorFlowCNN';
import { BenchmarkUnitaireModule } from '../generation/bordereau/modules/cadre-etudiant/BenchmarkUnitaireModule';
import { detecterAprilTags } from './preparation/detecterAprilTags';
import { matToSharp } from '../../utils/imgUtils';
import { OpenCvInstance } from '../services/OpenCvInstance';

type MimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

interface RecognitionConfidenceStats {
    total: number;
    correctCount: number;
    incorrectCount: number;
    sumConfidenceCorrect: number;
    sumConfidenceIncorrect: number;
    highConfidenceIncorrect70: number;
    lowConfidenceCorrect30: number;
}

interface BenchmarkStats {
    total: number;
    totalBonGlobalMaxConf: number;
    totalBonCnn: number;
    totalBonOCR: number;
    echecTotal: number;
    tempsTotalOCR: number;
    tempsTotalCNN: number;
    pageIndex: number;
    echecsParPage: number[];
    pagesImpossiblesReportComplet: number[];
    pagesImpossiblesPlusDeuxLettres: number[];
    resultatOCRBenchmark: Record<string, number>;
    resultatCNNBenchmark: Record<string, number>;
    jamaisReconnusLettres: Record<string, number>;
    confidenceOCR: RecognitionConfidenceStats;
    confidenceCNN: RecognitionConfidenceStats;
    confidenceGlobal: RecognitionConfidenceStats;
}

export const dimensionsFormats = {
    A4: { formatWidthMm: 210, formatHeightMm: 297 },
};

const ALPHABET = "BCEFGHIKLNOPQRSTUWXYZ";

// WIP : chemin deviendra buffer/busboy
export async function lireBordereau(chemin: string, mimeType: MimeType): Promise<void> {
    const stats: BenchmarkStats = {
        total: 0,
        totalBonGlobalMaxConf: 0,
        totalBonCnn: 0,
        totalBonOCR: 0,
        echecTotal: 0,
        tempsTotalOCR: 0,
        tempsTotalCNN: 0,
        pageIndex: 0,
        echecsParPage: [],
        pagesImpossiblesReportComplet: [],
        pagesImpossiblesPlusDeuxLettres: [],
        resultatOCRBenchmark: {},
        resultatCNNBenchmark: {},
        jamaisReconnusLettres: {},
        confidenceOCR: creerStatsConfiance(),
        confidenceCNN: creerStatsConfiance(),
        confidenceGlobal: creerStatsConfiance(),
    };

    const buffer = readFileSync(chemin);
    const uint8 = new Uint8Array(buffer);

    // Configuration
    // TODO: rendre dynamique/configurable
    const margeCiblesMm = 10;
    const diametreCiblesMm = 8;

    await extraireScans({ data: uint8, encoding: 'buffer', mimeType }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);

        const rois = new BenchmarkUnitaireModule().getZonesLecture().lettresCodeAnonymat;

        await TesseractOCR.configurerModeCaractereUnique(ALPHABET);

        // LIRE ETIQUETTES et transformer en str
        const detections = await detecterAprilTags(scan, matToSharp(await OpenCvInstance.getInstance(), scanPret));
        const code = detections.sort((a, b) => a.center[0] - b.center[0]).map(d => String.fromCharCode(d.id));

        const indexEchoues: number[] = [];
        const pageIndexCourante = stats.pageIndex;

        const onRoiExtrait = async (image: sharp.Sharp, index: number) => {
            const bufferImgTraitee = await preprocessPipelines
                .initial(image.clone())
                .resize({
                    width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
                    kernel: "lanczos3"
                })
                .png()
                .toBuffer();

            //await image.png().toFile('debug/rois/roi_' + index + '.png');
            //await preprocessPipelines.emnist(image).png().toFile('debug/rois/roi_emnist_' + index + '.png');

            const debutOCR = Date.now();
            const { text, confidence } = await TesseractOCR.interroger(bufferImgTraitee);
            stats.tempsTotalOCR += (Date.now() - debutOCR);

            const debutCNN = Date.now();
            const prediction = await TensorFlowCNN.predire(
                await preprocessPipelines.emnist(image).png().toBuffer(), 'EMNIST-Standard', ALPHABET
            );
            stats.tempsTotalCNN += (Date.now() - debutCNN);

            if (code.length <= index) {
                throw new Error(`Index ${index} non valide dans le code détecté : ${code.join('')}`);
            }
            const lettreAttendue = code[index];
            const texteOCR = text.trim().toUpperCase();
            const predictionOcrCorrecte = texteOCR === lettreAttendue;
            const predictionCnnCorrecte = prediction.caractere === lettreAttendue;
            const confianceOCR = normaliserConfiancePourcentage(confidence);
            const confianceCNN = normaliserConfiancePourcentage(prediction.confiance * 100);
            const confianceMax = Math.max(confianceOCR, confianceCNN);
            const predictionGlobaleCorrecte = confianceOCR >= confianceCNN ? predictionOcrCorrecte : predictionCnnCorrecte;

            stats.total++;
            enregistrerConfiance(stats.confidenceOCR, predictionOcrCorrecte, confianceOCR);
            enregistrerConfiance(stats.confidenceCNN, predictionCnnCorrecte, confianceCNN);
            enregistrerConfiance(stats.confidenceGlobal, predictionGlobaleCorrecte, confianceMax);

            //console.log(`ROI ${index} : ${text.trim()} (${confidence.toFixed(2)}%) -- attendu : ${lettreAttendue}`);
            if (predictionOcrCorrecte) {
                stats.totalBonOCR++;
            }
            if (predictionCnnCorrecte) {
                stats.totalBonCnn++;
            }
            if (predictionGlobaleCorrecte) {
                stats.totalBonGlobalMaxConf++;
            }
            if (lettreAttendue && !predictionOcrCorrecte && !predictionCnnCorrecte) {
                stats.echecTotal++;
                stats.echecsParPage[pageIndexCourante] = (stats.echecsParPage[pageIndexCourante] || 0) + 1;
                stats.jamaisReconnusLettres[lettreAttendue] = (stats.jamaisReconnusLettres[lettreAttendue] || 0) + 1;
                //console.log('Echec total ROI ' + index + ': attendu ' + lettreAttendue + ', Tesseract a lu "' + text.trim() + '" (conf: ' + confidence.toFixed(2) + '%), CNN a lu "' + prediction.caractere + '" (confiance: ' + (prediction.confiance * 100).toFixed(2) + '%).');
                indexEchoues.push(index);

                await preprocessPipelines.emnist(image).png().toFile('debug/rois/erreurs/page_' + (pageIndexCourante + 1).toString() + '_' + prediction.caractere + '_' + lettreAttendue + '.png');
            }

            //console.log("PREDICTION CNN :", prediction.caractere, "confiance :", (prediction.confiance * 100).toFixed(2) + '% -- attendu :', lettreAttendue);

            const key = `${lettreAttendue}${texteOCR}`;
            stats.resultatOCRBenchmark[key] = (stats.resultatOCRBenchmark[key] || 0) + 1;
            const keyCnn = `${lettreAttendue}${prediction.caractere}`;
            stats.resultatCNNBenchmark[keyCnn] = (stats.resultatCNNBenchmark[keyCnn] || 0) + 1;

            //console.log(`ROI ${index} découpée et sauvegardée.`);
        }

        try {
            await decouperROIs(scanPret, rois, diametreCiblesMm, margeCiblesMm, 'A4', onRoiExtrait, { paddingMm: -0.5 });

            // Méthode 1 : report complet (déjà implémentée)
            for (const index of indexEchoues) {
                if (indexEchoues.some(v => index + 3 === v)) {
                    stats.pagesImpossiblesReportComplet.push(pageIndexCourante);
                    break;
                }
            }

            // Méthode 2 : échec complet si plus de 2 lettres non lues
            if (indexEchoues.length > 2) {
                stats.pagesImpossiblesPlusDeuxLettres.push(pageIndexCourante);
            }

        } catch (err) {
            throw ErreurDecoupeROIs.assigner(err);
        } finally {
            scanPret.delete();
            stats.pageIndex++;
        }
    });

    const resultatTotal = fusionnerResultats(stats.resultatOCRBenchmark, stats.resultatCNNBenchmark);

    console.log('---------- MATRICE OCR ----------');
    console.log(versCSV(stats.resultatOCRBenchmark));
    console.log('---------- MATRICE CNN ----------');
    console.log(versCSV(stats.resultatCNNBenchmark));
    console.log('---------- MATRICE OCR+CNN ----------');
    console.log(versCSV(resultatTotal));

    console.log('---------- STATS PAR METHODE ----------');
    afficherStatsMethode('OCR', stats.totalBonOCR, stats.total, stats.confidenceOCR);
    afficherStatsMethode('CNN', stats.totalBonCnn, stats.total, stats.confidenceCNN);
    afficherStatsMethode('OCR+CNN (max confiance)', stats.totalBonGlobalMaxConf, stats.total, stats.confidenceGlobal);
    console.log('Echecs totaux stricts (OCR ET CNN incorrects sur une même case) : ' + stats.echecTotal + ' sur ' + stats.total + ' cases. soit ' + toPercent(stats.echecTotal, stats.total));

    console.log('---------- TEMPS MOYENS ----------');
    console.log('Temps moyen OCR par lettre : ' + toAverage(stats.tempsTotalOCR, stats.total) + ' ms');
    console.log('Temps moyen CNN par lettre : ' + toAverage(stats.tempsTotalCNN, stats.total) + ' ms');

    console.log('---------- LETTRES JAMAIS RECONNUES ----------');
    const lettres = Object.keys(stats.jamaisReconnusLettres)
        .sort((a, b) => (stats.jamaisReconnusLettres[b] ?? 0) - (stats.jamaisReconnusLettres[a] ?? 0))
        .slice(0, 8);
    for (const lettre of lettres) {
        console.log(`Lettre ${lettre} : ${stats.jamaisReconnusLettres[lettre]} échecs complets.`);
    }

    console.log('---------- ECHECS PAR PAGE ----------');
    stats.echecsParPage.forEach((echecs, index) => {
        if (echecs > 0) {
            console.log(`Page ${index + 1} : ${echecs} échecs complets.`);
        }
    });

    console.log('---------- BENCHMARK ECHEC CODE ----------');
    console.log(
        'Méthode report complet (index i et i+3 en échec) -> pages impossibles :',
        stats.pagesImpossiblesReportComplet.map(index => index + 1)
    );
    console.log(
        'Méthode >2 lettres non lues -> pages impossibles :',
        stats.pagesImpossiblesPlusDeuxLettres.map(index => index + 1)
    );
    console.log('------------------------------\n\n');

}

function fusionnerResultats(
    resultatOCRBenchmark: Record<string, number>,
    resultatCNNBenchmark: Record<string, number>
): Record<string, number> {
    const resultatTotal: Record<string, number> = {};
    for (const key of new Set([...Object.keys(resultatOCRBenchmark), ...Object.keys(resultatCNNBenchmark)])) {
        resultatTotal[key] = (resultatOCRBenchmark[key] || 0) + (resultatCNNBenchmark[key] || 0);
    }
    return resultatTotal;
}

function creerStatsConfiance(): RecognitionConfidenceStats {
    return {
        total: 0,
        correctCount: 0,
        incorrectCount: 0,
        sumConfidenceCorrect: 0,
        sumConfidenceIncorrect: 0,
        highConfidenceIncorrect70: 0,
        lowConfidenceCorrect30: 0,
    };
}

function normaliserConfiancePourcentage(confiance: number): number {
    if (!Number.isFinite(confiance)) {
        return 0;
    }
    if (confiance < 0) {
        return 0;
    }
    if (confiance > 100) {
        return 100;
    }
    return confiance;
}

function enregistrerConfiance(
    statsConfiance: RecognitionConfidenceStats,
    estCorrect: boolean,
    confiancePct: number
): void {
    statsConfiance.total++;
    if (estCorrect) {
        statsConfiance.correctCount++;
        statsConfiance.sumConfidenceCorrect += confiancePct;
        if (confiancePct < 30) {
            statsConfiance.lowConfidenceCorrect30++;
        }
        return;
    }

    statsConfiance.incorrectCount++;
    statsConfiance.sumConfidenceIncorrect += confiancePct;
    if (confiancePct > 70) {
        statsConfiance.highConfidenceIncorrect70++;
    }
}

function afficherStatsMethode(
    nom: string,
    totalCorrect: number,
    totalPredictions: number,
    confiance: RecognitionConfidenceStats
): void {
    console.log(`--- ${nom} ---`);
    console.log('Précision (taux de réussite) : ' + toPercent(totalCorrect, totalPredictions));
    console.log('Taux d\'échec : ' + toPercent(totalPredictions - totalCorrect, totalPredictions));
    console.log('Confiance moyenne (correct) : ' + toAveragePercent(confiance.sumConfidenceCorrect, confiance.correctCount));
    console.log('Confiance moyenne (incorrect) : ' + toAveragePercent(confiance.sumConfidenceIncorrect, confiance.incorrectCount));
    console.log('Erreurs à confiance >70% : ' + toPercent(confiance.highConfidenceIncorrect70, confiance.incorrectCount) + ` (${confiance.highConfidenceIncorrect70}/${confiance.incorrectCount})`);
    console.log('Réussites à confiance <30% : ' + toPercent(confiance.lowConfidenceCorrect30, confiance.correctCount) + ` (${confiance.lowConfidenceCorrect30}/${confiance.correctCount})`);
}

function toAveragePercent(total: number, count: number): string {
    return toAverage(total, count) + '%';
}

function toPercent(numerateur: number, denominateur: number): string {
    if (!denominateur) {
        return '0.00%';
    }
    return ((numerateur / denominateur) * 100).toFixed(2) + '%';
}

function toAverage(total: number, count: number): string {
    if (!count) {
        return '0.00';
    }
    return (total / count).toFixed(2);
}

function versCSV(resultats: Record<string, number>): string {
    const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let csvOutput = ' ,' + lettres.join(',') + '\n';
    for (const lettreAttendue of lettres) {
        const row = [lettreAttendue];
        for (const lettreDetectee of lettres) {
            const key = `${lettreAttendue}${lettreDetectee}`;
            row.push(resultats[key] ? String(resultats[key]) : '0');
        }
        csvOutput += row.join(',') + '\n';
    }
    return csvOutput;
}