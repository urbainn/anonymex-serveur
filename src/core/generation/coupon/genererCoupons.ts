import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Epreuve } from '../../../cache/epreuves/Epreuve';
import { Session } from '../../../cache/sessions/Session';
import { Convocation } from '../../../cache/convocations/Convocation';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import { etudiantCache } from '../../../cache/etudiants/EtudiantCache';

/**
 * Génère (et stream dans la response) les coupons d'identification pour une épreuve donnée.
 * @returns true si la génération s'est correctement déroulée
 */
export async function genererCoupons(session: Session, epreuve: Epreuve, res: Response): Promise<boolean> {

    const doc = new PDFDocument({
        size: "A4",
        autoFirstPage: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    // Mettre tous les étudiants en cache
    await etudiantCache.getAll();

    const couponsParPage = 10;

    // Mapping salle -> convocations
    const convocations = await epreuve.convocations.getAll();
    const convocsSalles = new Map<string, Convocation[]>();
    for (const convocation of convocations) {
        if (!convocsSalles.has(convocation.codeSalle)) convocsSalles.set(convocation.codeSalle, []);
        convocsSalles.get(convocation.codeSalle)?.push(convocation);
    }

    const docW = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Dimensions coupon
    const hauteurCoupon = doc.page.height / (couponsParPage / 2);
    const largeurCoupon = doc.page.width / 2;

    function genererCoupon(convocation: Convocation, date: string, x: number, y: number): void {

        // Entête : DATE + CODE EPREUVE / "Coupon à conserver" + Nom UE / Salle + Rang
        const hauteurEntete = hauteurCoupon * 0.2;
        /* date  */ doc.fontSize(10)
            .font('Helvetica').fillColor('#222').text(date, x + 7, y + 7);

        /* code  */ doc.fontSize(10)
            .text(epreuve.codeEpreuve, x + 7, y + hauteurEntete - 14);

        /* texte */ doc.fontSize(11).font('Helvetica-Bold')
            .text("Coupon à conserver", x, y + 7, { align: 'center', width: largeurCoupon });

        /* UE    */ doc.fontSize(9).font('Helvetica')
            .text(epreuve.nom, x + largeurCoupon / 4, y + 20, { align: 'center', width: largeurCoupon - largeurCoupon / 2, ellipsis: true, height: 12 });

        /* salle  */ doc.fontSize(10)
            .text(convocation.codeSalle, x, y + 7, { align: 'right', width: largeurCoupon - 7 });

        /* rang   */ doc.fontSize(10)
            .text(convocation.rang ? `Rang ${convocation.rang}` : "", x, y + hauteurEntete - 14, { align: 'right', width: largeurCoupon - 7 });

        doc.moveTo(x, y + hauteurEntete).lineTo(x + largeurCoupon, y + hauteurEntete).stroke();

        // Corps : Nom \ Prénom \ N° étudiant
        if (convocation.numeroEtudiant === null) {
            // code réservé ?
        } else {

            const etudiant = etudiantCache.get(convocation.numeroEtudiant);
            doc.fontSize(13).font('Helvetica-Bold').fillColor('#222')
                .text(etudiant?.nom.toLocaleUpperCase('fr') || "???", x + 10, y + hauteurEntete + 20,
                    { width: largeurCoupon - 20, align: 'center', ellipsis: true, height: 15 });

            doc.fontSize(12).font('Helvetica')
                .text(etudiant?.prenom || "???", x + 10, y + hauteurEntete + 37,
                    { width: largeurCoupon - 20, align: 'center', ellipsis: true, height: 15 });

            const numeroEtudiant = `N° étudiant : ${convocation.numeroEtudiant}`;
            const xNumeroEtudiant = x + 15;
            const yNumeroEtudiant = y + hauteurEntete + 12;
            doc.save();
            doc.fontSize(10).fillColor('#666').font('Helvetica-Oblique');
            doc.rotate(90, { origin: [xNumeroEtudiant, yNumeroEtudiant] });
            doc.text(numeroEtudiant, xNumeroEtudiant, yNumeroEtudiant,
                { width: hauteurCoupon - hauteurEntete - 24, align: 'center', ellipsis: true, height: 15 });
            doc.restore();

        }

        // Cadre: Code d'anonymat
        doc.fillColor('#222').rect(x + 80, y + hauteurCoupon - 66, largeurCoupon - 160, 45)
            .lineWidth(0.5)
            .strokeColor('black')
            .stroke();

        doc.fontSize(10).font('Helvetica');
        const texte = "Code d'anonymat";
        const largeurTexte = doc.widthOfString(texte);

        doc.rect(x + largeurCoupon / 2 - largeurTexte / 2 - 5, y + hauteurCoupon - 70, largeurTexte + 10, 20).fillColor('white').fill();
        doc.fillColor('black').text(texte, x + largeurCoupon / 2 - largeurTexte / 2, y + hauteurCoupon - 70);

        // Code d'anonymat
        doc.fontSize(18).font('Helvetica-Bold').fillColor('#111')
            .text(convocation.codeAnonymat, x + 3, y + hauteurCoupon - 50, { width: largeurCoupon, align: 'center', characterSpacing: 7, lineBreak: false });

    }

    // Chaque salle est séparée par une page d'identification
    let premiereSalle = true;
    for (const [salle, convocs] of convocsSalles) {
        if (convocs.length === 0) continue;
        const convocsTriees = convocs.sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0));

        if (!premiereSalle) {
            doc.addPage();
        } else premiereSalle = false;

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
        doc.fontSize(21).text(`${epreuve.codeEpreuve} : ${epreuve.nom}`, 20, 80, { align: 'center', width: docW - 40, height: 24, ellipsis: true });
        doc.fontSize(16).text(dateEpreuve.format('D MMMM YYYY [de] HH:mm') + ' à ' + heureFin, 20, 115, { align: 'center', width: docW - 40 });

        // Ligne
        doc.moveTo(20, 200).lineTo(docW - 20, 200).stroke();

        // Nom de la salle
        doc.font('Helvetica-Bold').fontSize(80).text(salle, 20, doc.page.height / 2 - 20, { align: 'center', width: docW - 40 });

        // Ligne (nb. de convocs )
        doc.moveTo(20, doc.page.height - 200).lineTo(docW - 20, doc.page.height - 200).stroke();
        const nbPages = Math.ceil(convocs.length / couponsParPage);
        doc.font('Helvetica-Bold').fontSize(18).text(`${convocs.length} étudiant${convocs.length > 1 ? 's' : ''}`, 20, doc.page.height - 130, { align: 'center', width: docW - 40 });
        doc.font('Helvetica').fontSize(16).text(`${nbPages} page${nbPages > 1 ? 's' : ''}`, 20, doc.page.height - 100, { align: 'center', width: docW - 40 });

        // Tracer coupons
        for (let i = 0; i < convocsTriees.length; i++) {
            if (i % couponsParPage === 0) {
                doc.addPage();

                // Tracer les lignes de séparation des coupons
                for (let j = 1; j < couponsParPage / 2; j++) {
                    const yLigne = j * hauteurCoupon;
                    doc.moveTo(0, yLigne).lineTo(doc.page.width, yLigne).stroke();
                }
                doc.moveTo(largeurCoupon, 0).lineTo(largeurCoupon, doc.page.height).stroke();
            }
            const convocation = convocsTriees[i];
            if (!convocation) continue;
            const x = (i % 2) * largeurCoupon;
            const y = Math.floor((i % couponsParPage) / 2) * hauteurCoupon;
            convocation.rang = i + 1;
            genererCoupon(convocation, dateEpreuve.format('DD/MM/YYYY'), x, y);
        }
    }

    doc.end();
    return true;

}
