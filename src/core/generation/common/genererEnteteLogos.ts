import { ImagesImportsCache } from "../../../cache/ImagesImportsCache";

/**
 * Will draw the header with the university and faculty logos on the given PDF document, centered.
 * @param doc 
 * @param height 
 * @param width 
 */
export async function genererEnteteLogos(doc: PDFKit.PDFDocument): Promise<void> {

    const { universite, faculte } = await ImagesImportsCache.getLogos();
    const margeHaut = 35;
    const gapLogos = 20;

    const noLogo = (x: number, y: number, nom: string) => {
        doc.fillColor("#DDD").rect(x, y, 200, 60).fill();
        doc.fillColor("#000").fontSize(13).text(`Aucun visuel pour ${nom}\nimporté via les paramètres\n(accueil > paramètres)`, x + 5, y + 5);
    };

    const univTaille = universite ? 140 : 200;
    const facTaille = faculte ? 140 : 200;
    const totalTaille = univTaille + facTaille + gapLogos;

    doc.font("Helvetica-Oblique");

    if (universite) {
        const x = (doc.page.width - totalTaille) / 2;
        doc.image(universite.buffer, x, margeHaut, { width: universite.width, height: universite.height, fit: [140, 80] });
    } else {
        noLogo((doc.page.width - totalTaille) / 2, margeHaut, "l'université");
    }

    if (faculte) {
        const x = (doc.page.width - totalTaille) / 2 + univTaille + gapLogos;
        doc.image(faculte.buffer, x, margeHaut, { width: faculte.width, height: faculte.height, fit: [140, 80] });
    } else {
        noLogo((doc.page.width - totalTaille) / 2 + univTaille + gapLogos, margeHaut, "la faculté");
    }

}