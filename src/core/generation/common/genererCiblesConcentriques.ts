import { mmToPoints } from "../../../utils/pdfUtils";

/** Nombre de cercles concentriques pour chaque cible en fonction du coin (HG, HD, BG, BD) */
export const CIBLES_NB_RINGS = [4, 2, 3, 1]; // HG, HD, BG, BD

/**
 * Génère sur le document des cibles circulaires concentriques (bullseyes) sur les bords.
 * @param doc Document PDFKit (modifié en place)
 * @param tailleMm taille des cibles en mm 
 * @param margeInterneMm marge interne des cibles par rapport aux bords du document (en mm)
 */
export function genererCiblesConcentriques(doc: PDFKit.PDFDocument, tailleMm: number, margeInterneMm: number) {

    const taille = mmToPoints(tailleMm);
    const margeInterne = mmToPoints(margeInterneMm);

    const positions = [
        { x: margeInterne, y: margeInterne },
        { x: doc.page.width - taille - margeInterne, y: margeInterne },
        { x: margeInterne, y: doc.page.height - taille - margeInterne },
        { x: doc.page.width - taille - margeInterne, y: doc.page.height - taille - margeInterne },
    ];

    for (const pos of positions) {
        const index = positions.indexOf(pos);
        const nbRings = CIBLES_NB_RINGS[index]!;
        const ringThickness = taille / (2 * nbRings); // Chaque anneau a une épaisseur égale

        for (let i = 0; i < nbRings; i++) {
            const currentRingSize = taille - (i * 2 * ringThickness);
            const isBlack = i % 2 === 0;

            doc.circle(
                pos.x + taille / 2,
                pos.y + taille / 2,
                currentRingSize / 2
            ).fill(isBlack ? '#111' : '#FFFFFF');
        }
    }

}