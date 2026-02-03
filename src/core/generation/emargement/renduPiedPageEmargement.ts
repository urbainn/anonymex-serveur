import PDFDocument from 'pdfkit';
import { mmToPoints } from '../../../utils/pdfUtils';

export function renduPiedPageEmargement(doc: typeof PDFDocument, x: number, y: number, largeur: number) {

    const debutTexteX = x + 48;

    // Consignes de pointage
    // dessiner une petite flèche sortant de la colonne de pointage
    doc.moveTo(x + 33, y)
        .lineTo(x + 33, y + 14)
        .lineTo(debutTexteX - 4, y + 14)
        .strokeColor('#000000').lineWidth(0.5).stroke();

    const consignesTitre = "Réservé aux surveillants : ";
    const consignesTexte = "indiquer la présence des étudiants en noircissant la case correspondante.";

    // Texte des consignes
    doc.fontSize(9);
    doc.font('Helvetica-Bold');
    doc.text(consignesTitre, debutTexteX, y + 8, { continued: true });
    doc.font('Helvetica');
    doc.text(consignesTexte, { width: largeur - 25, align: 'left' });

    // Deuxième ligne d'instructions
    const consignesTexte2 = "Au feutre ou stylo noir, couvrir la surface (";
    const consignesTexteNon = "), éviter les traits et cochers (";
    const consignesTexteFin = ") afin d'assurer la lecture optique.";

    doc.font('Helvetica');
    doc.text(consignesTexte2 + '        ', debutTexteX, y + 19, { continued: true });
    doc.font('Helvetica');
    doc.text(consignesTexteNon + '    ', { continued: true });
    doc.font('Helvetica');
    doc.text(consignesTexteFin);

    // Position x après le texte
    const positionYApresTexte = debutTexteX + doc.widthOfString(consignesTexte2);

    // Pictrogramme de pointage
    const tailleCarreMm = mmToPoints(2.5);
    const renduCase = (xPos: number, yPos: number) => doc.rect(xPos, yPos, tailleCarreMm, tailleCarreMm).strokeColor('#000000').lineWidth(0.5).stroke();

    // Case 1 : rond dans carré
    const yCases = y + 18.8;
    renduCase(positionYApresTexte + 1.5, yCases);
    doc.circle(positionYApresTexte + 1.5 + tailleCarreMm / 2, yCases + tailleCarreMm / 2, tailleCarreMm / 2.8).fill('#555').fillColor('#000000');

    // Case 2 : carré avec tracé
    renduCase(positionYApresTexte + 11, yCases);
    doc.moveTo(positionYApresTexte + 11, yCases + 3)
        .lineTo(positionYApresTexte + 11 + tailleCarreMm - 2.5, yCases)
        .lineTo(positionYApresTexte + 11, yCases + tailleCarreMm - 0.5)
        .lineTo(positionYApresTexte + 11 + tailleCarreMm, yCases + 1)
        .lineTo(positionYApresTexte + 11 + 2.5, yCases + tailleCarreMm)
        .lineTo(positionYApresTexte + 11 + tailleCarreMm, yCases + tailleCarreMm - 2.5)
        .strokeColor('#666').lineWidth(1.1).lineJoin('round').lineCap('round').stroke();

    // Case 3 (contre-exemple) : croix dans carré
    const positionXCase3 = positionYApresTexte + doc.widthOfString(consignesTexteNon) + 21.4;
    renduCase(positionXCase3, yCases);
    doc.moveTo(positionXCase3 + 2, yCases + 2)
        .lineTo(positionXCase3 + tailleCarreMm - 2, yCases + tailleCarreMm - 2)
        .moveTo(positionXCase3 + tailleCarreMm - 2, yCases + 2)
        .lineTo(positionXCase3 + 2, yCases + tailleCarreMm - 2)
        .strokeColor('#444').lineWidth(1.1).lineJoin('round').lineCap('round').stroke();

}