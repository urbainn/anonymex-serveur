import dayjs from "dayjs";
import { Epreuve } from "../../../cache/epreuves/Epreuve";
import PDFDocument from 'pdfkit';

export function renduEnteteEmargement(doc: typeof PDFDocument, epreuve: Epreuve, noms: [string, string][],
    salle: string, marges: { gauche: number, droite: number }, pagination: string) {

    // En-tête : A-Z | Infos Epreuve 
    doc.fontSize(14).fillColor('#000000');
    const titresY = 27;

    // Première/dernière lettres
    doc.font('Helvetica');
    const xDebutLettres = marges.gauche + 10;
    const lettresAfficher = noms.length > 0 ? `${noms[0]![1].charAt(0).toUpperCase()}-${noms[noms.length - 1]![1].charAt(0).toUpperCase()}` : '';
    doc.text(lettresAfficher, xDebutLettres, titresY, { align: 'left', baseline: 'middle' });

    // Titre (centré)
    doc.font('Helvetica-Bold');
    const titreTexte = "LISTE D'ÉMARGEMENT";
    const titreLargeur = doc.widthOfString(titreTexte, { lineBreak: false });
    doc.text(titreTexte, (doc.page.width - titreLargeur) / 2, titresY - 3, { baseline: 'middle' });

    // Pagination (droite)
    doc.font('Helvetica');
    const paginationTexte = pagination;
    const paginationLargeur = doc.widthOfString(paginationTexte, { lineBreak: false });
    doc.text(paginationTexte, doc.page.width - marges.droite - paginationLargeur - 11, titresY, { baseline: 'middle', lineBreak: false });

    // Infos épreuve (centré, sous le titre)
    doc.font('Helvetica');
    doc.fontSize(13);
    const nomEpreuve = epreuve.nom.length > 0 ? epreuve.nom[0]!.toUpperCase() + epreuve.nom.slice(1).toLowerCase() : 'Épreuve';
    const infosTexte = `${epreuve.codeEpreuve} - ${nomEpreuve}`;
    const infosLargeur = doc.widthOfString(infosTexte, { lineBreak: false });
    doc.text(infosTexte, (doc.page.width - infosLargeur) / 2, titresY + 14, { baseline: 'middle' });

    // Date, heure, salle
    const dateDayjs = dayjs(epreuve.dateEpreuve * 1000);
    const dateLisible = dateDayjs.format('DD/MM/YYYY');
    const heureLisible = dateDayjs.format('HH') + 'h' + dateDayjs.format('mm');
    const dateTexte = `${dateLisible} - ${heureLisible} - ${salle}`;
    const dateLargeur = doc.widthOfString(dateTexte, { lineBreak: false });
    doc.text(dateTexte, (doc.page.width - dateLargeur) / 2, titresY + 31, { baseline: 'middle' });
}