import { ErreurDocumentSource } from '../lectureErreurs';
import { logInfo, styles } from '../../utils/logger';
import { getDocument } from 'pdfjs-dist';
import { pdfToBuffer } from './conversion/pdfToBuffer';

type DocumentSource = { data: Buffer; encoding: string; mimeType: string };

/**
 * Extrait le/les scan(s) d'un document source prêts à la lecture.
 * @param doc Le document source à traiter : PDF, image ou archive de pdf/images.
 * @param scanExtrait Callback appelé pour chaque scan extrait, avec un buffer image 3 canaux.
 */
export async function extraireScans(doc: DocumentSource, scanExtrait: (scan: ImageData) => void): Promise<void> {

    logInfo('extraireScans', 'Extraction des scans du document source. ' + styles.dim
        + '(format ' + styles.fg.cyan + doc.mimeType + styles.reset + styles.dim + ')');

    // Convertir le document source en scans prêts à la lecture
    switch (doc.mimeType) {
        case 'application/pdf':
            // Charger le document PDF
            const pdf = await getDocument(doc.data).promise;
            const nbPages = pdf.numPages;

            // Charger et faire un rendu de chaque page
            for (let pageNum = 1; pageNum <= nbPages; pageNum++) {
                logInfo('extraireScans', `Extraction du scan de la page ${pageNum} / ${nbPages} du PDF source.`);
                scanExtrait(await pdfToBuffer(pdf, pageNum));
            }
            break;

        default:
            throw new ErreurDocumentSource(`Type de document source non supporté : ${doc.mimeType}`);
    }

}