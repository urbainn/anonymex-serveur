import sharp from "sharp";
import { DocumentSource, ScanData } from "../extraireScans";
import { ErreurDocumentSource } from "../../lectureErreurs";

/**
 * Le buffer est déjà au format attendu - on extrait uniquement les métadonnées de scan.
 * @param source 
 */
export async function imgToBuffer(source: DocumentSource): Promise<ScanData> {
    const meta = await sharp(source.data).metadata();
    if (!meta.width || !meta.height || !meta.channels) {
        throw new ErreurDocumentSource('Impossible de lire les métadonnées de l\'image source.');
    }

    const scanData: ScanData = {
        width: meta.width,
        height: meta.height,
        channels: meta.channels as 1 | 3 | 4,
        debug: true,
        raw: false
    };

    return scanData;
}