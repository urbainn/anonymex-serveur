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

export const dimensionsFormats = {
    A4: { formatWidthMm: 210, formatHeightMm: 297 },
};

// WIP : chemin deviendra buffer/busboy
export function lireBordereau(chemin: string): void {

    const buffer = readFileSync(chemin);
    const uint8 = new Uint8Array(buffer);

    const bordereauConfig: BordereauAnonProprietes = {
        longueurCodeAnonymat: 4,
        longueurCodeEpreuve: 2,
        format: 'A4',
        version: 1
    };

    // Configuration
    // TODO: rendre dynamique/configurable
    const margesAprilTagsMm = 10;
    const tailleAprilTagMm = 10;
    const roiPaddingMm = 1;

    extraireScans({ data: uint8, encoding: 'buffer', mimeType: 'application/pdf' }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);
        const rois = new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getLayoutPositions().lettresCodeAnonymat;

        const vraiOrdre = 'ANBOCPDQERFSGTHUIVJWKXLYMZ'.split('');
        let totalBon = 0;
        const resultatBenchmark: Record<string, number> = {}; // x: lettre correcte, y: lettre détectée, xy: nombre de fois (ex: AA: 5, AB: 2, ...)


        await TesseractOCR.configurerModeCaractereUnique('ABCDEFGHIJKLMNOPQRSTUVWXYZ');

        const onRoiExtrait = async (image: sharp.Sharp, index: number) => {
            const bufferImgTraitee = await preprocessPipelines
                .initial(image)
                .png()
                .toBuffer();

            //await image.png().toFile('debug/rois/roi_' + index + '.png');
            const { text, confidence } = await TesseractOCR.interroger(bufferImgTraitee);

            const lettreAttendue = vraiOrdre[Math.floor(index / 10)];

            console.log(`ROI ${index} : ${text.trim()} (${confidence.toFixed(2)}%) -- attendu : ${lettreAttendue}`);
            if (text.trim().toUpperCase() === lettreAttendue) totalBon++;

            const key = `${lettreAttendue}${text.trim().toUpperCase()}`;
            resultatBenchmark[key] = (resultatBenchmark[key] || 0) + 1;

            //console.log(`ROI ${index} découpée et sauvegardée.`);
        }

        try {
            await decouperROIs(scanPret, rois, tailleAprilTagMm, margesAprilTagsMm, 'A4', onRoiExtrait, { paddingMm: roiPaddingMm });

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

        } catch (err) {
            throw ErreurDecoupeROIs.assigner(err);
        } finally {
            scanPret.delete();
        }
    });

}