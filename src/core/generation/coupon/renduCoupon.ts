import dayjs from "dayjs";
import { Convocation } from "../../../cache/epreuves/convocations/Convocation";
import { Epreuve } from "../../../cache/epreuves/Epreuve";
import { etudiantCache } from "../../../cache/etudiants/EtudiantCache";
import { Salle } from "../../../cache/salles/Salle";
import { genererEnteteLogos } from "../common/genererEnteteLogos";
import PDFDocument from "pdfkit";
import { tronquerTexte } from "../../../utils/pdfUtils";

export async function renduCoupon(doc: typeof PDFDocument, epreuve: Epreuve, convocation: Convocation, salle?: Salle): Promise<void> {
    const marges = { gauche: 35, droite: 35, haut: 35, bas: 35 };

    doc.addPage({ margins: { top: 0, bottom: 0, left: 40, right: 40 }, size: 'A4' });

    await genererEnteteLogos(doc, marges.haut);

    const etudiant = convocation.numeroEtudiant ? etudiantCache.get(convocation.numeroEtudiant) : undefined;

    // Constantes de rendu
    const largeurDoc = doc.page.width - marges.gauche - marges.droite;

    // Texte à gauche ET droite : 3 premières lettres du NOM, rang, num étudiant
    if (etudiant) {
        const nomEtudiantCourt = etudiant.nom.substring(0, 3);

        for (const cote of ['right', 'left'] as ['right', 'left']) {
            doc.fill('#111').font('Helvetica-Bold').fontSize(19).text(nomEtudiantCourt, marges.gauche, 38, { align: cote, width: largeurDoc, lineBreak: false });
            doc.font('Helvetica').fontSize(14).text(`Place ${convocation.rang ?? 'N/A'}`, marges.gauche, 60, { align: cote, width: largeurDoc, lineBreak: false });
            doc.font('Helvetica').fillColor('#555').fontSize(14).text(etudiant.numeroEtudiant.toString(), marges.gauche, 78, { align: cote, width: largeurDoc, lineBreak: false });
        }
    }

    // Ligne
    doc.strokeColor('#222');
    doc.moveTo(marges.gauche, marges.haut + 80).lineTo(doc.page.width - marges.droite, marges.haut + 80).stroke();

    // Titre feuille
    doc.fill('#222');
    doc.font('Helvetica-Bold').fontSize(18).text("Feuille d'identification", marges.gauche, 154, { align: 'center', width: largeurDoc });
    doc.font('Helvetica').fontSize(14).text(`${epreuve.codeEpreuve} : ${epreuve.nom}`, marges.gauche, 180, { align: 'center', width: largeurDoc });

    // prop. de la convocation
    const renduProp = (prop: string, valeur: string, x: number, y: number) => {
        doc.font('Helvetica-Bold').fontSize(14).text(prop + ' : ', x, y, { continued: true });
        const tailleProp = doc.widthOfString(prop + ' : ', { lineBreak: false });
        doc.font('Helvetica').fontSize(14).text(valeur, { width: (largeurDoc - 50) / 2 - tailleProp, lineBreak: true });
    };

    const estSupplementaire = etudiant === undefined;
    let yProps = 240;

    if (!estSupplementaire) {
        renduProp('Nom', tronquerTexte(doc, etudiant.nom, (largeurDoc - 50) / 2 - 30), marges.gauche + 20, yProps);
        yProps += 22;
        renduProp('Prénom', tronquerTexte(doc, etudiant.prenom, (largeurDoc - 50) / 2 - 50), marges.gauche + 20, yProps);
        yProps += 22;
        renduProp('N° étudiant', etudiant.numeroEtudiant.toString(), marges.gauche + 20, yProps);
        yProps += 22;
        if (convocation.rang !== null) {
            renduProp('Place', convocation.rang.toString(), marges.gauche + 20, yProps);
        }
    }

    const colonnePropsEpreuveX = estSupplementaire ? 60 : marges.gauche + largeurDoc / 2 + 20;

    yProps = 240;
    renduProp('Date', dayjs.unix(epreuve.dateEpreuve).format('DD/MM/YYYY [à] HH[h]mm'), colonnePropsEpreuveX, 240);
    yProps += 22;
    renduProp('Durée', `${Math.floor(epreuve.duree / 60)}h${(epreuve.duree % 60).toString().padStart(2, '0')}`, colonnePropsEpreuveX, yProps);
    yProps += 22;
    renduProp('Lieu', salle ? `${salle.libelleSalle}` : 'N/A', colonnePropsEpreuveX, yProps);

    // Ligne
    doc.moveTo(marges.gauche, 360).lineTo(doc.page.width - marges.droite, 360).strokeColor('#222').lineWidth(0.5).stroke();

    // CODE ANONYMAT
    const yCode = 430;
    doc.font('Helvetica-Bold').fontSize(18).text("Code d'anonymat", marges.gauche, yCode, { align: 'center', width: largeurDoc });

    // Ajoute un espace au milieu du code (si nb pair, sinon inchangé)
    const code = convocation.codeAnonymat;
    const codeAffichable = code.length % 2 === 0 ?
        code.substring(0, code.length / 2) + " " + code.substring(code.length / 2) : code;

    doc.font('Helvetica-Bold').fontSize(32).fillColor('#222').text(codeAffichable, marges.gauche, yCode + 45, {
        align: 'center',
        width: largeurDoc,
        characterSpacing: 4
    });

    // Dessiner cadre code
    const cadreWidth = doc.widthOfString(codeAffichable, { lineBreak: false, characterSpacing: 4 }) + 20;
    const cadreHeight = doc.currentLineHeight() + 10;
    const cadreX = (doc.page.width - cadreWidth) / 2;
    const cadreY = yCode + 40;
    doc.rect(cadreX - 15, cadreY - 10, cadreWidth + 30, cadreHeight + 15)
        .lineWidth(1)
        .strokeColor('#222')
        .stroke();

    const xSeparation = doc.page.width / 2;
    const tailleColonne = doc.page.width / 2 - 40;
    const yCadreConsignes = doc.page.height - marges.bas - 190;

    // Ligne de separation centrale
    doc.moveTo(xSeparation, yCadreConsignes).lineTo(xSeparation, yCadreConsignes + 150).lineWidth(0.8).strokeColor('black').stroke();

    // COLONNE GAUCHE : Exemple de reproduction du code
    {
        // Instructions texte
        doc.fontSize(13)
            .font('Helvetica')
            .fillColor('black')
            .text('Reproduisez le code ci-dessous\ndans les cases dédiées.',
                xSeparation - tailleColonne,
                yCadreConsignes + 10,
                { align: 'center', width: tailleColonne }
            );

        // Dessiner code
        doc.font('Helvetica-Bold')
            .fontSize(15)
            .fillColor('black')
            .text(codeAffichable, xSeparation - tailleColonne, yCadreConsignes + 55,
                { align: 'center', width: tailleColonne, characterSpacing: 2 });

        // Flèche
        const flecheX = xSeparation - (tailleColonne / 2);
        const flecheY = yCadreConsignes + 80;
        doc.moveTo(flecheX - 8, flecheY)
            .lineTo(flecheX + 8, flecheY)
            .lineTo(flecheX, flecheY + 8)
            .closePath()
            .fillColor('black')
            .fill();

        // Cadres d'exemple remplis
        const cadreW = 20;
        const cadresDepartX = xSeparation - (tailleColonne / 2) - ((cadreW + 4) * code.length / 2);
        for (let i = 0; i < code.length; i++) {
            const cadreX = cadresDepartX + i * (cadreW + 4);
            const cadreY = yCadreConsignes + 100;
            doc.rect(cadreX, cadreY, cadreW, cadreW * 1.2)
                .lineWidth(0.5)
                .strokeColor('black')
                .stroke();

            // Exemple de lettre dans le cadre
            if (i < code.length) {
                const lettre = code[i] ?? '?';
                doc.font('Helvetica-Bold')
                    .fontSize(15)
                    .fillColor('black')
                    .text(lettre, cadreX, cadreY + 7, { align: 'center', width: cadreW });
            }
        }

    }

    // COLONNE DROITE : Instructions
    {

        const margesLaterales = 45;
        const tailleCase = 20;

        // Affiche une case 'X' (ne pas faire) et un texte explicatif
        const renduLigneInstruction = (instruction: string, y: number, c = true) => {

            // case
            doc.rect(xSeparation + margesLaterales, y, tailleCase, tailleCase * 1.2)
                .lineWidth(0.5)
                .strokeColor('black')
                .stroke();

            // Cercle contenant une croix
            if (c) doc.circle(xSeparation + margesLaterales + tailleCase - 2, y + tailleCase * 1.2 - 2, 6)
                .fillColor('white')
                .fill()
                .circle(xSeparation + margesLaterales + tailleCase - 2, y + tailleCase * 1.2 - 2, 6)
                .stroke()
                .moveTo(xSeparation + margesLaterales + tailleCase - 4 - 2, y + tailleCase * 1.2 - 4 - 2)
                .lineTo(xSeparation + margesLaterales + tailleCase + 4 - 2, y + tailleCase * 1.2 + 4 - 2)
                .moveTo(xSeparation + margesLaterales + tailleCase - 4 - 2, y + tailleCase * 1.2 + 4 - 2)
                .lineTo(xSeparation + margesLaterales + tailleCase + 4 - 2, y + tailleCase * 1.2 - 4 - 2)
                .lineWidth(1)
                .strokeColor('black')
                .stroke();

            // Instruction texte
            doc.fontSize(12).font('Helvetica').fillColor('black');
            const largeurMaxTexte = tailleColonne - 2 * margesLaterales - tailleCase;
            const hauteurTexte = doc.heightOfString(instruction, { width: largeurMaxTexte });

            doc.text(instruction, xSeparation + margesLaterales + tailleCase + 13, y + (tailleCase * 1.2 - hauteurTexte) / 2 + 3,
                { align: 'left', width: largeurMaxTexte });
        }

        const debutY = 22;

        // Écrire en majuscules
        doc.fontSize(15).font('Helvetica-Bold').fillColor('black')
            .text('E', xSeparation + margesLaterales + 5, yCadreConsignes + debutY + 7);
        renduLigneInstruction('Écrire en majuscules.', yCadreConsignes + debutY, false);

        // Écrire au stylo noir/bleu
        doc.fontSize(15).font('Helvetica-Bold').fillColor('#AFAFAF')
            .text('A', xSeparation + margesLaterales + 5, yCadreConsignes + debutY + 35 + 6.5);
        renduLigneInstruction('Écrire au stylo noir/bleu.', yCadreConsignes + debutY + 35);

        // Ne pas déborder
        doc.save().scale(1.5, 1);
        doc.fontSize(16).font('Helvetica').fillColor('black')
            .text('W', (xSeparation + margesLaterales - 1) / 1.5, yCadreConsignes + debutY + 70 + 7);
        doc.restore();
        renduLigneInstruction('Ne pas déborder.', yCadreConsignes + debutY + 70);
    }

}