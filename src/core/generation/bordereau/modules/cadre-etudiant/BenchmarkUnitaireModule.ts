import { mmToPoints } from "../../../../../utils/pdfUtils";
import { genererAprilTag } from "../../../common/genererAprilTags";
import { LayoutPosition, ModeleLectureBase } from "../../../ModeleLectureBase";
import { join } from 'path';
export class BenchmarkUnitaireModule extends ModeleLectureBase {

    /** Nombre de caractères composant le code */
    private nbCaractres: number = 6;

    constructor() {
        super();
    }

    getNom(): string {
        return "Module de test/benchmark (UNITAIRE)";
    }

    getFormat(): "A4" | "A5" {
        return "A4";
    }

    getZonesLecture() {
        const tailleDoc = 595; // Largeur d'une page A4 en points
        const gap = 6; // Espace entre les cadres
        const largeurCadre = 30;
        const y = 420;

        const cadres: LayoutPosition[] = [];

        for (let i = 0; i < this.nbCaractres; i++) {
            const x = (tailleDoc - (this.nbCaractres * largeurCadre + (this.nbCaractres - 1) * gap)) / 2 + i * (largeurCadre + gap);
            cadres.push({ x, y, largeur: largeurCadre, hauteur: largeurCadre * 1.2 });
        }

        return { lettresCodeAnonymat: cadres };
    }

    generer(pdf: PDFKit.PDFDocument): boolean {

        const xSeparation = pdf.page.width / 2;
        const tailleColonne = pdf.page.width / 2 - 40;
        const yCadreConsignes = 70;

        // générer un code aléatoire de nbCaractres lettres majuscules
        let code = ""; // aucune lettre répétée
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        while (code.length < this.nbCaractres) {
            const lettre = alphabet[Math.floor(Math.random() * alphabet.length)]!;
            if (!code.includes(lettre)) {
                code += lettre;
            }
        }

        // Ajoute un espace au milieu du code (si nb pair, sinon inchangé)
        const codeAffichable = this.nbCaractres % 2 === 0 ?
            code.substring(0, this.nbCaractres / 2) + " " + code.substring(this.nbCaractres / 2) : code;

        // Ligne de separation centrale
        pdf.moveTo(xSeparation, yCadreConsignes).lineTo(xSeparation, yCadreConsignes + 150).lineWidth(0.8).strokeColor('black').stroke();

        // COLONNE GAUCHE : Exemple de reproduction du code
        {
            // Instructions texte
            pdf.fontSize(13)
                .font('Helvetica')
                .fillColor('black')
                .text('Reproduisez le code ci-dessous\ndans les cases dédiées.',
                    xSeparation - tailleColonne,
                    yCadreConsignes + 10,
                    { align: 'center', width: tailleColonne }
                );

            // Dessiner code
            pdf.font('Helvetica-Bold')
                .fontSize(15)
                .fillColor('black')
                .text(codeAffichable, xSeparation - tailleColonne, yCadreConsignes + 55,
                    { align: 'center', width: tailleColonne, characterSpacing: 2 });

            // Flèche
            const flecheX = xSeparation - (tailleColonne / 2);
            const flecheY = yCadreConsignes + 80;
            pdf.moveTo(flecheX - 8, flecheY)
                .lineTo(flecheX + 8, flecheY)
                .lineTo(flecheX, flecheY + 8)
                .closePath()
                .fillColor('black')
                .fill();

            // Cadres d'exemple remplis
            const cadreW = 20;
            const cadresDepartX = xSeparation - (tailleColonne / 2) - ((cadreW + 4) * this.nbCaractres / 2);
            for (let i = 0; i < this.nbCaractres; i++) {
                const cadreX = cadresDepartX + i * (cadreW + 4);
                const cadreY = yCadreConsignes + 100;
                pdf.rect(cadreX, cadreY, cadreW, cadreW * 1.2)
                    .lineWidth(0.5)
                    .strokeColor('black')
                    .stroke();

                // Exemple de lettre dans le cadre
                if (i < code.length) {
                    const lettre = code[i] ?? '?';
                    pdf.font('Helvetica-Bold')
                        .fontSize(15)
                        .fillColor('black')
                        .text(lettre, cadreX, cadreY + 7, { align: 'center', width: cadreW });
                }
            }

        }

        // COLONNE DROITE : Ne pas faire
        {

            const margesLaterales = 45;
            const tailleCase = 20;

            // Affiche une case 'X' (ne pas faire) et un texte explicatif
            const renduLigneInstruction = (instruction: string, y: number) => {

                // case
                pdf.rect(xSeparation + margesLaterales, y, tailleCase, tailleCase * 1.2)
                    .lineWidth(0.5)
                    .strokeColor('black')
                    .stroke()

                // Cercle contenant une croix
                pdf.circle(xSeparation + margesLaterales + tailleCase - 2, y + tailleCase * 1.2 - 2, 6)
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
                pdf.fontSize(12).font('Helvetica').fillColor('black');
                const largeurMaxTexte = tailleColonne - 2 * margesLaterales - tailleCase;
                const hauteurTexte = pdf.heightOfString(instruction, { width: largeurMaxTexte });

                pdf.text(instruction, xSeparation + margesLaterales + tailleCase + 13, y + (tailleCase * 1.2 - hauteurTexte) / 2 + 3,
                    { align: 'left', width: largeurMaxTexte });
            }

            const debutY = 22;

            // Écrire en majuscules
            pdf.fontSize(15).font('Helvetica-Bold').fillColor('black')
                .text('e', xSeparation + margesLaterales + 6, yCadreConsignes + debutY + 6.5);
            renduLigneInstruction('Écrire en majuscules.', yCadreConsignes + debutY);

            // Écrire au stylo noir/bleu
            pdf.fontSize(15).font('Helvetica-Bold').fillColor('#AFAFAF')
                .text('A', xSeparation + margesLaterales + 5, yCadreConsignes + debutY + 35 + 6.5);
            renduLigneInstruction('Écrire au stylo noir/bleu.', yCadreConsignes + debutY + 35);

            // Ne pas déborder
            pdf.save().scale(1.5, 1);
            pdf.fontSize(16).font('Helvetica').fillColor('black')
                .text('W', (xSeparation + margesLaterales - 1) / 1.5, yCadreConsignes + debutY + 70 + 7);
            pdf.restore();
            renduLigneInstruction('Ne pas déborder.', yCadreConsignes + debutY + 70);
        }

        // CODE
        pdf.fontSize(28).font('Helvetica-Bold').fillColor('black')
            .text(codeAffichable, 0, 350, { align: 'center', width: pdf.page.width, characterSpacing: 4 });

        // Flèche
        const flecheX = pdf.page.width / 2;
        const flecheY = 390;
        pdf.moveTo(flecheX - 12, flecheY)
            .lineTo(flecheX + 12, flecheY)
            .lineTo(flecheX, flecheY + 12)
            .closePath()
            .fillColor('black')
            .fill();

        // Dessiner les cases
        const layout = this.getZonesLecture();
        for (const position of layout.lettresCodeAnonymat) {
            this.dessinerCadreLettre(pdf, position);
        }

        // Zone d'encodage par tag
        {
            pdf.rect(90, 700, pdf.page.width - 180, 60)
                .lineWidth(0.5)
                .strokeColor('black')
                .stroke();

            // "Ne rien inscrire"
            pdf.fontSize(10).font('Helvetica-Oblique');
            const texte = "Ne rien inscrire dans cette zone";
            const largeurTexte = pdf.widthOfString(texte);
            const hauteurTexte = pdf.heightOfString(texte);

            pdf.rect(100, 690, largeurTexte + 10, hauteurTexte + 10).fillColor('white').fill();
            pdf.fillColor('black').text(texte, 105, 696.5);

            // Dessiner les tags
            const tailleTagMm = 11;
            const tailleTagPt = mmToPoints(tailleTagMm);
            const gapTags = 10;

            for (let i = 0; i < code.length; i++) {
                const tagX = 105 + i * (tailleTagPt + gapTags);
                const tagY = 715;

                genererAprilTag(pdf, code.charCodeAt(i), tailleTagMm, tagX, tagY, 8);
            }

            // Dessiner code barre
            pdf.font(join(__dirname, '../../../../../../resources/font/Libre_Barcode_39/LibreBarcode39-Regular.ttf'));
            pdf.fontSize(35).fillColor('#222');
            const tailleCodeBarre = pdf.widthOfString(`*${code}*`);
            pdf.text(`*${code}*`, pdf.page.width - 100 - tailleCodeBarre, 720);
        }

        return true;
    }

    dessinerCadreLettre(pdf: PDFKit.PDFDocument, position: LayoutPosition): void {
        pdf.rect(position.x, position.y, position.largeur, position.hauteur)
            .lineWidth(0.5)
            .strokeColor('black')
            .stroke()

    }

}