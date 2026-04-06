import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Salle } from '../../../cache/salles/Salle';
import dayjs from 'dayjs';

/**
 * Génère une feuille de séparation pour une salle d'un examen.
 * Crée une page.
 */
export async function renduFeuilleSalle(doc: typeof PDFDocument, epreuve: Epreuve, salle: Salle, nbConvocs: number, nbSupplementaires: number): Promise<void> {

    doc.addPage();
    doc.fillColor('#222');

    // Triangle dans le coin supérieur droit
    const triangleSize = 40;
    doc.moveTo(doc.page.width - triangleSize, 0)
        .lineTo(doc.page.width, 0)
        .lineTo(doc.page.width, triangleSize)
        .fill('#222');

    const dateEpreuve = dayjs.unix(epreuve.dateEpreuve).locale('fr');
    const heureFin = dayjs.unix(epreuve.dateEpreuve + epreuve.duree * 60).format('HH:mm');

    // Page d'identification de la salle
    doc.fontSize(21).text(`${epreuve.codeEpreuve} : ${epreuve.nom}`, 20, 80, { align: 'center', width: doc.page.width - 40, height: 24, ellipsis: true });
    doc.fontSize(16).text(dateEpreuve.format('D MMMM YYYY [de] HH:mm') + ' à ' + heureFin, 20, 115, { align: 'center', width: doc.page.width - 40 });

    // Ligne
    doc.moveTo(20, 200).lineTo(doc.page.width - 20, 200).stroke();

    // Nom de la salle
    doc.font('Helvetica-Bold').fontSize(80).text(salle.codeSalle, 20, doc.page.height / 2 - 20, { align: 'center', width: doc.page.width - 40 });

    // Ligne (nb. de convocs )
    doc.moveTo(20, doc.page.height - 200).lineTo(doc.page.width - 20, doc.page.height - 200).stroke();
    const nbPages = nbConvocs + nbSupplementaires > 0 ? nbSupplementaires + 1 : 0;
    doc.font('Helvetica-Bold').fontSize(18).text(`${nbConvocs} étudiant${nbConvocs > 1 ? 's' : ''}`, 20, doc.page.height - 130, { align: 'center', width: doc.page.width - 40 });
    doc.font('Helvetica').fontSize(16).text(`${nbPages} page${nbPages > 1 ? 's' : ''}`, 20, doc.page.height - 100, { align: 'center', width: doc.page.width - 40 });

}