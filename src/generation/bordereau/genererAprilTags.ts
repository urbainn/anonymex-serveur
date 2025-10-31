import { AprilTagFamily } from 'apriltag'
import tagConfigFamille from 'apriltag/families/standard41h12.json'
import { mmToPoints } from '../../utils/pdfUtils';
import { ErreurAprilTag } from '../generationErreurs';

/**
 * Génère sur le document entré les 4 AprilTags aux coins.
 * @param doc Document PDFKit (modifié en place)
 * @param tailleMm taille des tags en mm (pour scan 200DPI, 14mm recommandé, DPI + élevé -> taille plus petite possible)
 * @param margeInterneMm marge interne des tags par rapport aux bords du document (en mm)
 * @param coins liste des coins auxquels attacher un tag, 0 = haut droit, 1 = haut gauche, 2 = bas droit, 3 = bas gauche.
 */
export function genererAprilTags(doc: PDFKit.PDFDocument, tailleMm: number, margeInterneMm: number, coins?: number[]) {

    const famille = new AprilTagFamily(tagConfigFamille);
    const taille = mmToPoints(tailleMm);
    const margeInterne = mmToPoints(margeInterneMm);
    const rembourrage = 0.1; // Afin d'éviter les petits espacements entre les pixels lors de certains rendus PDF

    const tagIds = [10, 11, 12, 13];

    const positions = [
        { x: margeInterne, y: margeInterne },
        { x: doc.page.width - taille - margeInterne, y: margeInterne },
        { x: margeInterne, y: doc.page.height - taille - margeInterne },
        { x: doc.page.width - taille - margeInterne, y: doc.page.height - taille - margeInterne },
    ];

    const tailleDePixel = taille / famille.size; // Taille d'un pixel du tag en points PDF
    const margeQuietZone = 4 * tailleDePixel; // Marge "quiet zone" autour du tag

    for (let i of coins ?? [0, 1, 2, 3]) {
        if (i < 0 || i > 3) throw new ErreurAprilTag("Coin en dehors de la plage autorisée (0..3)");

        // Sous forme de tableau de pixels (b=black,w=white,x=transparent) formant le tag
        const tagPixels = famille.render(tagIds[i]!);

        // --- DESSIN DU TAG ---
        const tagX = positions[i]!.x;
        const tagY = positions[i]!.y;

        // quiet zone
        doc.rect(tagX - margeQuietZone, tagY - margeQuietZone, taille + 2 * margeQuietZone, taille + 2 * margeQuietZone).fill('#FFFFFF');

        // Dessiner chaque pixel individuellement (jusqu'à 9x9 = 81 pixels)
        for (let x = 0; x < tagPixels.length; x++) {
            for (let y = 0; y < tagPixels.length; y++) {
                if (tagPixels[x]![y] === 'b') {
                    // Rempli avec un gris à 80% : économie d'encre
                    doc.rect(
                        /* x */ tagX + x * tailleDePixel - rembourrage,
                        /* y */ tagY + y * tailleDePixel - rembourrage,
                        /* w */ tailleDePixel + 2 * rembourrage,
                        /* h */ tailleDePixel + 2 * rembourrage
                    ).fill('#333333');
                }
            }
        }
    }
}