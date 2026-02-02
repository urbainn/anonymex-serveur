import PDFDocument from 'pdfkit';

/**
 * Millimètres vers points PDF
 * @param mm Valeur en millimètres
 * @returns Valeur en points PDF
 */
export function mmToPoints(mm: number): number {
    return (mm * 72) / 25.4;
}

/**
 * Points PDF vers millimètres
 * @param points Valeur en points PDF
 * @returns Valeur en millimètres
 */
export function pointsToMm(points: number): number {
    return (points * 25.4) / 72;
}

/**
 * Tronquer un texte pour qu'il tienne dans une largeur maximale donnée. Surplus remplacé par "…"
 * @param doc 
 * @param texte 
 * @param largeurMax (en points PDF)
 * @returns 
 */
export function tronquerTexte(doc: typeof PDFDocument, texte: string, largeurMax: number): string {
    if (doc.widthOfString(texte) <= largeurMax) return texte;

    const ellipsis = '…';
    const largeurEllipsis = doc.widthOfString(ellipsis);

    for (let i = texte.length - 1; i >= 0; i--) {
        const tronque = texte.slice(0, i);
        if (doc.widthOfString(tronque) + largeurEllipsis <= largeurMax) {
            return tronque + ellipsis;
        }
    }
    return ellipsis;
}