import PDFDocument from 'pdfkit';

export function renduPiedPageEmargement(doc: typeof PDFDocument, x: number, y: number, largeur: number) {

    // Consignes de pointage
    // dessiner une petite flèche sortant de la colonne de pointage
    doc.moveTo(x + 10, y)
        .lineTo(x + 10, y + 15)
        .lineTo(x + 20, y + 15)
        .strokeColor('#000000').lineWidth(0.5).stroke();

    // Texte des consignes
    doc.fontSize(10);
    doc.font('Helvetica-Bold');
    doc.text("Réservé aux surveillants : ", x + 25, y + 11, { continued: true });
    doc.font('Helvetica');
    doc.text("indiquer la présence des étudiants en noircissant le carré correspondant.", { width: largeur - 25, align: 'left' });

}