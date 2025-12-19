import { readFileSync } from 'fs';
import { extraireScans, ScanData } from './preparation/extraireScans';
import { preparerScan } from './preparation/preparerScan';
import { BordereauAnonProprietes } from '../generation/bordereau/genererBordereau';
import { decouperROIs } from './preparation/decouperROIs';
import { CadreEtudiantBenchmarkModule } from '../generation/bordereau/modules/cadre-etudiant/CadreEtudiantBenchmarkModule';
import sharp from 'sharp';
import { ErreurDecoupeROIs } from './lectureErreurs';
import { preprocessPipelines } from './OCR/preprocessPipelines';
import { TesseractOCR } from './OCR/TesseractOCR';
import { TensorFlowCNN } from './CNN/TensorFlowCNN';

export const dimensionsFormats = {
    A4: { formatWidthMm: 210, formatHeightMm: 297 },
};

// WIP : chemin deviendra buffer/busboy
export function lireBordereau(chemin: string): void {

    const buffer = readFileSync(chemin);
    const uint8 = new Uint8Array(buffer);

    // Configuration
    // TODO: rendre dynamique/configurable
    const margeCiblesMm = 7;
    const diametreCiblesMm = 6;

    extraireScans({ data: uint8, encoding: 'buffer', mimeType: 'application/pdf' }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);

        const rois = new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getLayoutPositions().lettresCodeAnonymat;

        const vraiOrdre = 'ANBOCPDQERFSGTHUIVJWKXLYMZ'.split('');
        let totalBon = 0;
        let totalBonCnn = 0;
        let echecTotal = 0;
        const resultatBenchmark: Record<string, number> = {}; // x: lettre correcte, y: lettre détectée, xy: nombre de fois (ex: AA: 5, AB: 2, ...)

        await TesseractOCR.configurerModeCaractereUnique('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

        const onRoiExtrait = async (image: sharp.Sharp, index: number) => {
            const bufferImgTraitee = await preprocessPipelines
                .initial(image.clone())
                .resize({
                    width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
                    kernel: "lanczos3"
                })
                .png()
                .toBuffer();

            await image.png().toFile('debug/rois/roi_' + index + '.png');
            await preprocessPipelines.emnist(image).png().toFile('debug/rois/roi_emnist_' + index + '.png');
            const { text, confidence } = await TesseractOCR.interroger(bufferImgTraitee);
            const prediction = await TensorFlowCNN.predire(await preprocessPipelines.emnist(image).png().toBuffer(), 'EMNIST-Standard');

            const lettreAttendue = vraiOrdre[Math.floor(index / 10)];

            //console.log(`ROI ${index} : ${text.trim()} (${confidence.toFixed(2)}%) -- attendu : ${lettreAttendue}`);
            if (text.trim().toUpperCase() === lettreAttendue) totalBon++;
            if (prediction.caractere === lettreAttendue) totalBonCnn++;
            if (text.trim().toUpperCase() !== lettreAttendue && prediction.caractere !== lettreAttendue) {
                echecTotal++;
                console.log('Echec total ROI ' + index + ': attendu ' + lettreAttendue + ', Tesseract a lu "' + text.trim() + '" (conf: ' + confidence.toFixed(2) + '%), CNN a lu "' + prediction.caractere + '" (confiance: ' + (prediction.confiance * 100).toFixed(2) + '%).');
            }

            //console.log("PREDICTION CNN :", prediction.caractere, "confiance :", (prediction.confiance * 100).toFixed(2) + '% -- attendu :', lettreAttendue);

            const key = `${lettreAttendue}${text.trim().toUpperCase()}`;
            resultatBenchmark[key] = (resultatBenchmark[key] || 0) + 1;

            //console.log(`ROI ${index} découpée et sauvegardée.`);
        }

        try {
            await decouperROIs(scanPret, rois, diametreCiblesMm, margeCiblesMm, 'A4', onRoiExtrait);

            // TEMP pour benchmark!!
            const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
            let csvOutput = ' ,' + lettres.join(',') + '\n';
            for (const lettreAttendue of lettres) {
                const row = [lettreAttendue];
                for (const lettreDetectee of lettres) {
                    const key = `${lettreAttendue}${lettreDetectee}`;
                    row.push(resultatBenchmark[key] ? String(resultatBenchmark[key]) : '0');
                }
                csvOutput += row.join(',') + '\n';
            }
            console.log(csvOutput);
            console.log('\n\n%age de lettres correctes : ' + ((totalBon / rois.length) * 100).toFixed(2) + '%');
            console.log('%age de lettres correctes CNN : ' + ((totalBonCnn / rois.length) * 100).toFixed(2) + '%');
            console.log('Echecs totaux (les 2 méthodes incorrectes) : ' + echecTotal + ' sur ' + rois.length + ' lettres.');

        } catch (err) {
            throw ErreurDecoupeROIs.assigner(err);
        } finally {
            scanPret.delete();
        }
    });

}