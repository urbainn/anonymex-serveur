import { ErreurDocumentSource } from '../lectureErreurs';
import { logInfo, styles } from '../../../utils/logger';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { pdfToBuffer } from './conversion/pdfToBuffer';
import { imgToBuffer } from './conversion/imgToBuffer';

export type DocumentSource = { data: Uint8Array; encoding: string; mimeType: string };
export type ScanData = { channels: 1 | 3 | 4; debug: boolean; width: number; height: number; raw: boolean };

/**
 * Extrait le/les scan(s) d'un document source prêts à la lecture.
 * @param doc Le document source à traiter : PDF, image ou archive de pdf/images.
 * @param onScanExtrait Callback appelé pour chaque scan extrait, avec un buffer image 3 canaux.
 */
export async function extraireScans(doc: DocumentSource, onScanExtrait: (scan: ScanData, buffer: Uint8ClampedArray | Uint8Array) => Promise<void>, lirenb?: number): Promise<void> {

    logInfo('extraireScans', 'Extraction des scans du document source. ' + styles.dim
        + '(format ' + styles.fg.cyan + doc.mimeType + styles.fg.white + ')');

    // Convertir le document source en scans prêts à la lecture
    switch (doc.mimeType) {
        case 'application/pdf':
            // Charger le document PDF
            const pdf = await getDocument(doc.data).promise;
            const nbPages = Math.min(pdf.numPages, lirenb ?? pdf.numPages);

            // Charger et faire un rendu de chaque page
            for (let pageNum = 1; pageNum <= nbPages; pageNum++) {
                logInfo('extraireScans', `Extraction du scan de la page ${styles.fg.cyan}${pageNum}${styles.fg.white}/${nbPages} du PDF source.`);
                await onScanExtrait(...await pdfToBuffer(pdf, pageNum));
            }
            break;

        case 'image/jpeg':
        case 'image/png':
        case 'image/tiff':
            // Traiter l'image unique
            logInfo('extraireScans', `Extraction du scan de l'image source.`);
            const scan = await imgToBuffer(doc);
            await onScanExtrait(scan, doc.data);
            break;

        default:
            throw new ErreurDocumentSource(`Type de document source non supporté : ${doc.mimeType}`);
    }

}