import { logInfo, styles } from "../../../utils/logger";
import PDFDocument from 'pdfkit';
import { createWriteStream } from 'fs';
import { genererCiblesConcentriques } from "../common/genererCiblesConcentriques";
import { ErreurAprilTag } from "../generationErreurs";
import { mmToPoints } from "../../../utils/pdfUtils";

const LIGNES_PAR_PAGE = 35;
const MARGE_HORIZONTALE = mmToPoints(12 /* mm */);

export interface FeuilleEmargementProprietes {
    noms: [string, string][];
    version: 1;
}

export function genererFeuilleEmargement(proprietes: FeuilleEmargementProprietes): boolean {
    logInfo('genererFeuilleEmargement', 'Génération d\'une feuille d\'émargement..');
    const debutMs = Date.now();

    // Calculer la taille de chaque ligne de la feuille d'émargement

    // Initialiser le PDF
    const doc = new PDFDocument({ size: 'A4' });
    doc.pipe(createWriteStream('emargement_test.pdf'));

    // Rendu des pages
    const nbPages = Math.ceil(proprietes.noms.length / LIGNES_PAR_PAGE);
    let pageIndex = 0;
    while (pageIndex < nbPages) {

        // Nouvelle page sauf pour la première (crée automatiquement)
        if (pageIndex > 0) doc.addPage();

        // Couper les n premiers noms pour cette page
        const nomsPage = proprietes.noms.slice(pageIndex * LIGNES_PAR_PAGE, (pageIndex + 1) * LIGNES_PAR_PAGE);
        renduPageEmargement(doc, nomsPage, pageIndex + 1);
        pageIndex++;
    }


    doc.end();
    logInfo('genererFeuilleEmargement', 'Feuille d\'émargement générée avec succès. ' + styles.dim + `(en ${Date.now() - debutMs} ms)`);

    // note, l'objectif sera de renvoyer un stream via http (pipé dans la response) contenant le pdf généré, sans stockage local
    // pour l'instant on utilise le stockage local pour le développement
    return false;

}

function renduPageEmargement(doc: typeof PDFDocument, noms: [string, string][], numPage: number) {
    const ciblesMargeMm = 7;
    const ciblesTailleMm = 7;

    const hauteurZoneCiblesMm = ciblesMargeMm + ciblesTailleMm + 3 /* marge */;
    const hauteurLigneMm = (297 - 2 * hauteurZoneCiblesMm) / LIGNES_PAR_PAGE;
    const positionYDepartMm = hauteurZoneCiblesMm;

    // Generer les cibles concentriques aux 4 coins
    try {
        genererCiblesConcentriques(doc, 7, 7);
    } catch (error) {
        throw ErreurAprilTag.assigner(error);
    }

    // En-tête : A-Z | Infos Epreuve 
    doc.fontSize(14).fillColor('#000000');
    const titresY = mmToPoints(ciblesMargeMm + (ciblesTailleMm / 2) + 0.5);

    // Première/dernière lettres
    doc.font('Helvetica');
    const xDebutLettres = MARGE_HORIZONTALE;
    const lettresAfficher = noms.length > 0 ? `${noms[0]![1].charAt(0).toUpperCase()}-${noms[noms.length - 1]![1].charAt(0).toUpperCase()}` : '';
    doc.text(lettresAfficher, mmToPoints(ciblesMargeMm + ciblesTailleMm + 2), titresY, { align: 'left', baseline: 'middle' });

    // Infos épreuve (centré)
    doc.font('Helvetica-Bold');
    const titreTexte = "HAI601 - 20/05/2026 - Amphi 5.01";
    const titreLargeur = doc.widthOfString(titreTexte, { lineBreak: false });
    doc.text(titreTexte, (doc.page.width - titreLargeur) / 2, titresY, { baseline: 'middle' });

    // Numéro de page (centré bas)
    doc.fontSize(10);
    doc.font('Helvetica');
    const pageTexte = `Page ${numPage}`;
    const pageLargeur = doc.widthOfString(pageTexte, { lineBreak: false });
    doc.text(pageTexte, (doc.page.width - pageLargeur) / 2, doc.page.height - 28, { baseline: 'middle', lineBreak: false });

    // Lignes horizontales et noms
    doc.fontSize(12);
    let derniereLettreDebut = '';
    for (let i = 0; i < noms.length; i++) {
        const yDebut = mmToPoints(positionYDepartMm + i * hauteurLigneMm);
        const yFin = mmToPoints(positionYDepartMm + (i + 1) * hauteurLigneMm);
        const yMillieu = (yDebut + yFin) / 2;

        // Fill une ligne sur deux
        if (i % 2 === 1) {
            doc.rect(
                xDebutLettres, yDebut,
                doc.page.width - MARGE_HORIZONTALE - xDebutLettres,
                mmToPoints(hauteurLigneMm)
            ).fill('#F0F0F0').fillColor('#000000');
        }

        // Rendu LIGNE horizontale
        doc.moveTo(xDebutLettres, yDebut)
            .lineTo(doc.page.width - MARGE_HORIZONTALE, yDebut)
            .strokeColor('#000000').lineWidth(0.5).stroke();

        // Préparer nom et prénom
        const nom = noms[i]![1].toUpperCase();
        const prenom = noms[i]![0];

        // Rendu NOM Prénom
        const hauteurNomComplet = doc.heightOfString(nom + ' ' + prenom, { lineBreak: false });
        const largeurNom = doc.widthOfString(nom, { lineBreak: false });
        const hauteurLigne = yFin - yDebut;
        const yTexte = yMillieu - (hauteurLigne - hauteurNomComplet) / 2;

        // Rendu NOM
        doc.font('Helvetica-Bold').fillColor('#000000');
        doc.text(nom, xDebutLettres + mmToPoints(2), yTexte, {
            align: 'left',
            lineBreak: false
        })

        // Rendu Prénom
        doc.font('Helvetica');
        doc.text(' ' + prenom, xDebutLettres + mmToPoints(2) + largeurNom + 2, yTexte, {
            align: 'left',
            lineBreak: false
        });

        // Indicateur de lettre initiale (si changement de lettre)
        /* const lettreInitiale = nom.charAt(0).toUpperCase();
        if (lettreInitiale !== derniereLettreDebut) {
            const largeurLettre = doc.widthOfString(lettreInitiale, { lineBreak: false });
            doc.font('Helvetica-Bold');
            doc.text(lettreInitiale, xDebutLettres - largeurLettre - 5, yTexte, {
                align: 'right',
                lineBreak: false
            });
            derniereLettreDebut = lettreInitiale;
        } */

    }

    // Ligne finale (fermeture tableau)
    const yFinPage = mmToPoints(positionYDepartMm + noms.length * hauteurLigneMm);
    doc.moveTo(MARGE_HORIZONTALE, yFinPage)
        .lineTo(doc.page.width - MARGE_HORIZONTALE, yFinPage)
        .strokeColor('#000000').lineWidth(0.5).stroke();

    // Colonnes verticales
    const xPositionColonnes = [
        xDebutLettres, // délimitation gauche
        //MARGE_HORIZONTALE + 100, // début nom
        doc.page.width - MARGE_HORIZONTALE - 100, // début signature
        doc.page.width - MARGE_HORIZONTALE // délimitation droite
    ];

    for (let i = 0; i < xPositionColonnes.length; i++) {
        const xPos = xPositionColonnes[i]!;
        const yDebut = mmToPoints(positionYDepartMm);
        const yFin = mmToPoints(positionYDepartMm + noms.length * hauteurLigneMm);

        doc.moveTo(xPos, yDebut)
            .lineTo(xPos, yFin)
            .strokeColor('#000000')
            .lineWidth(0.5)
            .stroke();
    }

    return doc;
}