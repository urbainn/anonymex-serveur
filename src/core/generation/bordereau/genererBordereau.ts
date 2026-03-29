import PDFDocument from 'pdfkit';
import { logInfo } from '../../../utils/logger';
import { Response } from 'express';
import { genererEnteteLogos } from '../common/genererEnteteLogos';
import { genererCiblesConcentriques } from '../common/genererCiblesConcentriques';
import { ModeleBordereau } from './modeleBordereau';
import { LayoutPosition } from '../ModeleLectureBase';

export async function genererBordereau(res: Response): Promise<boolean> {

    logInfo('genererBordereau', 'Génération d\'un bordereau..');
    //const debutMs = Date.now();

    const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);

    await genererPageBordereau(doc);

    doc.end();

    return true;
}

export async function genererPageBordereau(doc: typeof PDFDocument): Promise<void> {
    doc.addPage();

    // Générer entete
    await genererEnteteLogos(doc);

    // Générer cibles concentriques
    genererCiblesConcentriques(doc, 9, 17);

    // Code Anonymat
    const codeAnonymatY = 212;

    doc.font("Helvetica-Bold")
        .fontSize(23)
        .text("Code anonymat", 0, codeAnonymatY, { align: "center" })
        .fill("#222")
        .font("Helvetica")
        .fontSize(12)
        .fillColor("#555")
        .text("Inscrire ci-dessous le code figurant sur votre fiche d'identification.", 0, codeAnonymatY + 30, { align: "center" })

    // Cadres du code anonymat
    const cadres = ModeleBordereau.getPositionsCadresAnonymat();
    doc.lineWidth(1).strokeColor("#333");
    for (const cadre of cadres) {
        doc.rect(cadre.x, cadre.y, cadre.largeur, cadre.hauteur).stroke();
    }

    // Cadre correcteur
    const cadreCorrecteurY = 458;
    const cadreCorrecteurHauteur = 240;

    const titreCadre = "Réservé au correcteur";
    doc.font("Helvetica-Oblique").fontSize(13);
    doc.rect(85, cadreCorrecteurY, doc.page.width - 170, cadreCorrecteurHauteur).stroke();
    doc.rect(105, cadreCorrecteurY - 5, doc.widthOfString(titreCadre) + 10, 10).fill("#FFF");
    doc.fillColor("#333").text(titreCadre, 110, cadreCorrecteurY - 5);

    function renduCaseNote(caseNote: LayoutPosition, libelle: string) {
        doc.roundedRect(caseNote.x, caseNote.y, caseNote.largeur, caseNote.hauteur, 3).stroke();
        doc.font("Helvetica").fontSize(10).fillColor("#333").text(libelle, caseNote.x - 15, caseNote.y - 13, { align: "center", width: caseNote.largeur + 30 });
    }

    // Cases de notation
    doc.lineCap("round").lineWidth(1).strokeColor("#333");
    const positionsNotes = ModeleBordereau.getPositionsCasesNote();

    for (let i = 0; i <= 24; i++) {
        if (i <= 20) {
            const caseNote = positionsNotes.notes[i];
            if (caseNote) renduCaseNote(caseNote, i.toString());
        } else if (i > 21) {
            const caseFraction = positionsNotes.fractions[i - 22];
            if (caseFraction) renduCaseNote(caseFraction, "+0," + ((i - 21) * 25).toString());
        }
    }

    // Ligne sépration note | fractions
    const note20 = positionsNotes.notes[20];
    const frac01 = positionsNotes.fractions[0];
    if (note20 && frac01) {
        const ligneX = ((note20.x + note20.largeur) + frac01.x) / 2;
        doc.moveTo(ligneX, note20.y - 8).lineTo(ligneX, frac01.y + frac01.hauteur + 2).stroke();
    }

    // Ligne de séparation grille / case erreur + champ "note"
    doc.moveTo(315, cadreCorrecteurY).lineTo(315, cadreCorrecteurY + cadreCorrecteurHauteur).stroke();

    const caseErreur = positionsNotes.caseErreur;
    if (caseErreur) {
        doc.roundedRect(caseErreur.x, caseErreur.y, caseErreur.largeur, caseErreur.hauteur, 3).stroke();
        doc.font("Helvetica").fontSize(10).fillColor("#333").text("Erreur", caseErreur.x + 20, caseErreur.y + 1);
    }

    // Texte instructions correcteur
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#444")
        .text("Reporter la note", 335, cadreCorrecteurY + 23, { continued: true })
        .font("Helvetica")
        .text(" en noircissant\nentièrement les cases correspondantes.\n\n"
            + "Pour une note avec décimale,cochez la\nnote et la fraction associée.\n\n"
            + "En cas d'erreur de report, noircir la\ncase ci-dessous :");

    // Cadre saisie note
    doc.moveTo(315, cadreCorrecteurY + 148).lineTo(doc.page.width - 85, cadreCorrecteurY + 148).stroke();

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#444")
        .text("Note", 335, cadreCorrecteurY + 168, { continued: true })
        .font("Helvetica-Oblique").fontSize(9).fillColor("#666").text(" (en chiffres)");

    const barreDeSaisie = (x: number, y: number, width: number) => {
        doc.moveTo(x, y).lineTo(x, y + 3).lineTo(x + width, y + 3).lineTo(x + width, y).stroke();
    };

    barreDeSaisie(335, cadreCorrecteurY + 215, 21);
    barreDeSaisie(335 + 25, cadreCorrecteurY + 215, 21);

    // Virgule
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#444").text(",", 335 + 53, cadreCorrecteurY + 205);

    barreDeSaisie(335 + 65, cadreCorrecteurY + 215, 21);
    barreDeSaisie(335 + 65 + 25, cadreCorrecteurY + 215, 21);
}