import { existsSync } from 'fs';
import { ErreurDocumentSource } from '../lectureErreurs';

type DocumentSource = { data: Buffer; encoding: string; mimeType: string };

/**
 * Extrait le/les scan(s) d'un document source prêts à la lecture.
 * @param doc Le document source à traiter : PDF, image ou archive de pdf/images.
 * @param scanExtrait Callback appelé pour chaque scan extrait, avec un buffer image 3 canaux.
 */
export async function extraireScans(doc: DocumentSource, scanExtrait: (scan: ImageData) => void): Promise<void> {

    // Convertir le document source en scans prêts à la lecture
    switch (doc.mimeType) {
        case 'application/pdf':
            // PDF : extraire les scans
            break;
        default:
            throw new ErreurDocumentSource(`Type de document source non supporté : ${doc.mimeType}`);
    }

}