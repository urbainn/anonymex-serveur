import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Session } from '../../../cache/sessions/Session';
import { renduCoupon } from './renduCoupon';
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';
import { salleCache } from '../../../cache/salles/SalleCache';
import { MediaService } from '../../services/MediaService';
import sharp from 'sharp';

/**
 * Génère (et stream dans la response) les coupons d'identification avec les scans intercalés
 * @param session Session d'examen
 * @param epreuve Épreuve concernée
 * @param codesAno Liste de codes d'anonymat pour lesquels afficher les coupons et scans
 * @param res Response pour streamer le PDF
 */
export async function genererDocCouponsAvecScans(
    session: Session,
    epreuve: Epreuve,
    codesAno: string[],
    res: Response
): Promise<boolean> {
    const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    // Mettre à jour les caches
    await etudiantCache.getAll();
    await salleCache.getAll();
    const convocs = await epreuve.convocations.getAll();

    // Récupérer les convocations demandées
    const convocationsMap = new Map<string, any>();
    for (const convocation of convocs) {
        convocationsMap.set(convocation.codeAnonymat, convocation);
    }

    // Vérifier aussi les convocations supplémentaires
    for (const convocSupp of epreuve.convocations.convocationsSupplementaires.values()) {
        convocationsMap.set(convocSupp.codeAnonymat, convocSupp);
    }

    const mediaDir = MediaService.getExamScansDir(session.id, epreuve.codeEpreuve);

    // Traiter chaque code d'anonymat
    for (const codeAno of codesAno) {
        const convocation = convocationsMap.get(codeAno);
        if (!convocation) {
            continue;
        }

        // Récupérer la salle
        const salle = salleCache.get(convocation.codeSalle);

        // 1. Générer la fiche d'identification
        await renduCoupon(doc, epreuve, convocation, salle);

        // 2. Essayer de charger et ajouter le scan
        try {
            const scanBuffer = await MediaService.lireMedia(mediaDir, `${codeAno}.webp`);
            console.log(`[DEBUG] Scan chargé pour ${codeAno}: buffer size = ${scanBuffer.length} bytes`);
            
            // Convertir le WebP en PNG (PDFKit ne supporte pas WebP)
            const pngBuffer = await sharp(scanBuffer).png().toBuffer();
            console.log(`[DEBUG] WebP converti en PNG: ${pngBuffer.length} bytes`);
            
            // Ajouter une nouvelle page pour le scan
            doc.addPage({ size: 'A4' });
            
            // Ajouter l'image en la redimensionnant pour tenir sur la page
            // La page A4 fait 595x842 points, on utilise 90% avec des marges
            const margin = 20;
            const maxWidth = doc.page.width - (2 * margin);
            const maxHeight = doc.page.height - (2 * margin);
            
            console.log(`[DEBUG] Ajout image: ${maxWidth}x${maxHeight}`);
            
            // Ajouter l'image avec les dimensions maximales, centrée
            doc.image(pngBuffer, margin, margin, {
                fit: [maxWidth, maxHeight],
                align: 'center'
            });
            
            console.log(`[DEBUG] Image ajoutée avec succès pour ${codeAno}`);
        } catch (err) {
            // Le scan n'existe pas ou erreur de lecture, on continue sans lui
            console.log(`[DEBUG] Erreur lors du chargement du scan pour ${codeAno}:`, err);
        }
    }

    doc.end();
    return true;
}
