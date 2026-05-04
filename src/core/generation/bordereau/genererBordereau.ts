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
    const codeAnonymatY = 180;

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

    // Saisie de l'épreuve
    const epreuveY = 350;
    doc.font("Helvetica").fontSize(12).fillColor("#222").text("Épreuve : .........................................................................", 0, epreuveY, { align: "center" });

    // Cadre correcteur
    const cadreCorrecteurY = 515;
    const cadreCorrecteurHauteur = 205;

    const titreCadre = "Réservé au correcteur";
    doc.font("Helvetica-Oblique").fontSize(13);
    doc.rect(70, cadreCorrecteurY, doc.page.width - 140, cadreCorrecteurHauteur).stroke();
    doc.rect(90, cadreCorrecteurY - 5, doc.widthOfString(titreCadre) + 10, 10).fill("#FFF");
    doc.fillColor("#333").text(titreCadre, 95, cadreCorrecteurY - 5);

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


    // Ligne de séparation grille / case erreur + champ "note"
    doc.moveTo(350, cadreCorrecteurY).lineTo(350, cadreCorrecteurY + cadreCorrecteurHauteur).stroke();

    const caseErreur = positionsNotes.caseErreur;
    doc.roundedRect(caseErreur.x, caseErreur.y, caseErreur.largeur, caseErreur.hauteur, 3).stroke();
    doc.font("Helvetica").fontSize(10).fillColor("#333").text("Erreur", caseErreur.x + 20, caseErreur.y + 1);

    // Texte instructions correcteur
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#444")
        .text("Reporter la note", 365, cadreCorrecteurY + 20, { continued: true })
        .font("Helvetica")
        .text(" en noircissant\nentièrement les cases correspondantes.\n\n"
            + "Pour une note avec décimale, cochez la\nnote et la fraction associée.\n\n"
            + "En cas d'erreur de report, noircir la\ncase ci-dessous :");

    // Cadre saisie note
    const cadreSaisieNoteY = 135;
    doc.lineWidth(1)
        .moveTo(350, cadreCorrecteurY + cadreSaisieNoteY)
        .lineTo(doc.page.width - 70, cadreCorrecteurY + cadreSaisieNoteY).stroke();

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#444")
        .text("Note", 365, cadreCorrecteurY + cadreSaisieNoteY + 15, { continued: true })
        .font("Helvetica").fillColor("#666").text(" / 20", { continued: true })
        .font("Helvetica-Bold").fillColor("#444").text(" : ");

    const barreDeSaisie = (x: number, y: number, width: number) => {
        doc.moveTo(x, y).lineTo(x, y + 3).lineTo(x + width, y + 3).lineTo(x + width, y).stroke();
    };

    barreDeSaisie(365, cadreCorrecteurY + cadreSaisieNoteY + 52, 21);
    barreDeSaisie(365 + 25, cadreCorrecteurY + cadreSaisieNoteY + 52, 21);

    // Virgule
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#444").text(",", 365 + 53, cadreCorrecteurY + cadreSaisieNoteY + 42);

    barreDeSaisie(365 + 65, cadreCorrecteurY + cadreSaisieNoteY + 52, 21);
    barreDeSaisie(365 + 65 + 25, cadreCorrecteurY + cadreSaisieNoteY + 52, 21);
}