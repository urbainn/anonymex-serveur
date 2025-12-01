import { readFileSync } from 'fs';
import { extraireScans, ScanData } from './preparation/extraireScans';
import { preparerScan } from './preparation/preparerScan';
import { BordereauAnonProprietes } from '../generation/bordereau/genererBordereau';
import { decouperROIs } from './preparation/decouperROIs';
import { CadreEtudiantBenchmarkModule } from '../generation/bordereau/modules/cadre-etudiant/CadreEtudiantBenchmarkModule';
import sharp from 'sharp';
import { ErreurDecoupeROIs } from './lectureErreurs';

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
    const roiPaddingMm = 1.5;

    extraireScans({ data: uint8, encoding: 'buffer', mimeType: 'image/jpeg' }, async (scan: ScanData, data: Uint8ClampedArray | Uint8Array) => {
        const scanPret = await preparerScan(scan, data);
        const rois = new CadreEtudiantBenchmarkModule('ABCDEFGHIJKLMNOPQRSTUVWXYZ').getLayoutPositions().lettresCodeAnonymat;
        const onRoiExtrait = async (image: sharp.Sharp, index: number) => {
            await image.grayscale()
                .normalise()
                .gamma(1.4) //1.2–1.6
                .resize({
                    width: 128, height: 128, fit: "contain", background: { r: 255, g: 255, b: 255 },
                    kernel: "lanczos3"
                })
                .median(1)
                .threshold(190)
                .flatten({ background: "#ffffff" })
                .png().toFile('debug/rois/roi_' + index + '.png');
            console.log(`ROI ${index} découpée et sauvegardée.`);
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