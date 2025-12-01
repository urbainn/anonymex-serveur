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

    extraireScans({ data: uint8, encoding: 'buffer', mimeType: 'image/jpeg' }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);
        const rois = new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getLayoutPositions().lettresCodeAnonymat;

        await TesseractOCR.setParams({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' });

        const onRoiExtrait = async (image: sharp.Sharp, index: number) => {
            const bufferImgTraitee = await preprocessPipelines.initial(image).png().toBuffer();
            //.png().toFile('debug/rois/roi_' + index + '.png');$
            const texteReconnu = await TesseractOCR.interroger(bufferImgTraitee);
            console.log('ROI ' + index + ' : ' + texteReconnu);
            //console.log(`ROI ${index} découpée et sauvegardée.`);
        }

        try {
            await decouperROIs(scanPret, rois, tailleAprilTagMm, margesAprilTagsMm, 'A4', onRoiExtrait, { paddingMm: roiPaddingMm });
        } catch (err) {
            throw ErreurDecoupeROIs.assigner(err);
        } finally {
            scanPret.delete();
        }
    });

}