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

let total = 0;
let totalBon = 0;
let totalBonCnn = 0;
let totalBonOCR = 0;
let echecTotal = 0;
let tempsTotalOCR = 0;
let tempsTotalCNN = 0;
let pageIndex = 0;
let echecsParPage: number[] = [];
let pagesImpossibles: number[] = [];
const resultatOCRBenchmark: Record<string, number> = {}; // x: lettre correcte, y: lettre détectée, xy: nombre de fois (ex: AA: 5, AB: 2, ...)
const resultatCNNBenchmark: Record<string, number> = {}; // idem, pour CNN
const resultatTotal: Record<string, number> = {}; // idem, pour OCR + CNN
const jamaisReconnusLettres: Record<string, number> = {}; // lettres jamais reconnues (clé: lettre, valeur: nombre d'échecs complets => OCR + CNN)

export const dimensionsFormats = {
    A4: { formatWidthMm: 210, formatHeightMm: 297 },
};

// WIP : chemin deviendra buffer/busboy
export async function lireBordereau(chemin: string, mimeType: MimeType): Promise<void> {

    const buffer = readFileSync(chemin);
    const uint8 = new Uint8Array(buffer);

    // Configuration
    // TODO: rendre dynamique/configurable
    const margeCiblesMm = 10;
    const diametreCiblesMm = 8;

    await extraireScans({ data: uint8, encoding: 'buffer', mimeType }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);

        const rois = new BenchmarkUnitaireModule().getZonesLecture().lettresCodeAnonymat;

        await TesseractOCR.configurerModeCaractereUnique('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

        // LIRE ETIQUETTES et transformer en str
        const detections = await detecterAprilTags(scan, matToSharp(await OpenCvInstance.getInstance(), scanPret));
        const code = detections.sort((a, b) => a.center[0] - b.center[0]).map(d => String.fromCharCode(d.id));

        let indexEchoues: number[] = []// indice des cases ayant échouées, pour savoir si une lecture avec redondance aurait été possible

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
            tempsTotalOCR += (Date.now() - debutOCR);

            const debutCNN = Date.now();
            const prediction = await TensorFlowCNN.predire(await preprocessPipelines.emnist(image).png().toBuffer(), 'EMNIST-Standard');
            tempsTotalCNN += (Date.now() - debutCNN);

            if (code.length <= index) {
                throw new Error(`Index ${index} non valide dans le code détecté : ${code.join('')}`);
            }
            const lettreAttendue = code[index];

            total++;

            //console.log(`ROI ${index} : ${text.trim()} (${confidence.toFixed(2)}%) -- attendu : ${lettreAttendue}`);
            if (text.trim().toUpperCase() === lettreAttendue) { totalBon++; totalBonOCR++; }
            if (prediction.caractere === lettreAttendue) { totalBonCnn++; totalBon++; }
            if (text.trim().toUpperCase() !== lettreAttendue && prediction.caractere !== lettreAttendue) {
                echecTotal++;
                echecsParPage[pageIndex] = (echecsParPage[pageIndex] || 0) + 1;
                jamaisReconnusLettres[lettreAttendue!] = (jamaisReconnusLettres[lettreAttendue!] || 0) + 1;
                //console.log('Echec total ROI ' + index + ': attendu ' + lettreAttendue + ', Tesseract a lu "' + text.trim() + '" (conf: ' + confidence.toFixed(2) + '%), CNN a lu "' + prediction.caractere + '" (confiance: ' + (prediction.confiance * 100).toFixed(2) + '%).');
                indexEchoues.push(index);

                await preprocessPipelines.emnist(image).png().toFile('debug/rois/erreurs/page_' + (pageIndex + 1).toString() + '_' + prediction.caractere + '_' + lettreAttendue + '.png');
            }

            //console.log("PREDICTION CNN :", prediction.caractere, "confiance :", (prediction.confiance * 100).toFixed(2) + '% -- attendu :', lettreAttendue);

            const key = `${lettreAttendue}${text.trim().toUpperCase()}`;
            resultatOCRBenchmark[key] = (resultatOCRBenchmark[key] || 0) + 1;
            const keyCnn = `${lettreAttendue}${prediction.caractere}`;
            resultatCNNBenchmark[keyCnn] = (resultatCNNBenchmark[keyCnn] || 0) + 1;

            //console.log(`ROI ${index} découpée et sauvegardée.`);
        }

        try {
            await decouperROIs(scanPret, rois, diametreCiblesMm, margeCiblesMm, 'A4', onRoiExtrait);

            // check si lecture impossible
            for (const index of indexEchoues) {
                if (indexEchoues.some(v => index + 3 === v)) {
                    pagesImpossibles.push(pageIndex);
                    break;
                }
            }

            // TEMP pour benchmark!!

            console.log(versCSV(resultatOCRBenchmark));
            console.log('---------- CNN ----------');
            console.log(versCSV(resultatCNNBenchmark));
            console.log('---------- TOTAL ----------');

            // fusion des 2 résultats
            for (const key of new Set([...Object.keys(resultatOCRBenchmark), ...Object.keys(resultatCNNBenchmark)])) {
                resultatTotal[key] = (resultatOCRBenchmark[key] || 0) + (resultatCNNBenchmark[key] || 0);
            }
            console.log(versCSV(resultatTotal));
            console.log('---------- STATS ----------');
            console.log('Lettres jamais reconnues (OCR + CNN) :');
            console.log('\n\n%age de lettres correctes : ' + ((totalBon / (total * 2)) * 100).toFixed(2) + '%');
            console.log('%age de lettres correctes CNN : ' + ((totalBonCnn / total) * 100).toFixed(2) + '%');
            console.log('%age de lettres correctes OCR : ' + ((totalBonOCR / total) * 100).toFixed(2) + '%');
            console.log('Echecs totaux (les 2 méthodes incorrectes) : ' + echecTotal + ' sur ' + total + ' lettres. soit ' + ((echecTotal / total) * 100).toFixed(2) + '%');
            console.log('---------- TEMPS MOYENS ----------');
            console.log('Temps moyen OCR par lettre : ' + (tempsTotalOCR / total).toFixed(2) + ' ms');
            console.log('Temps moyen CNN par lettre : ' + (tempsTotalCNN / total).toFixed(2) + ' ms');
            console.log('------------------------------');
            const lettres = Object.keys(jamaisReconnusLettres).sort((a, b) => jamaisReconnusLettres[b]! - jamaisReconnusLettres[a]!).slice(0, 8); // afficher un max de 8 lettres et trier par VALEUR
            for (const lettre of lettres) {
                console.log(`Lettre ${lettre} : ${jamaisReconnusLettres[lettre]} échecs complets.`);
            }
            console.log('------------------------------');
            console.log('Echecs par page :');
            echecsParPage.forEach((echecs, index) => {
                if (echecs > 3) {
                    console.log(`Page ${index + 1} : ${echecs} échecs complets.`);
                }
            });
            console.log('pages non lisible par méthode de redondance : ', pagesImpossibles);
            console.log('------------------------------\n\n');

        } catch (err) {
            throw ErreurDecoupeROIs.assigner(err);
        } finally {
            scanPret.delete();
            pageIndex++;
        }
    });

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