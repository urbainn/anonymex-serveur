import { ImagesImportsCache } from "../../../cache/ImagesImportsCache";

/**
 * Rendu des logos en entête des documents PDF
 * @param doc 
 * @param height 
 * @param width 
 */
export async function genererEnteteLogos(doc: PDFKit.PDFDocument, y?: number): Promise<void> {

    const { universite, faculte } = await ImagesImportsCache.getLogos();
    const margeHaut = y ?? 35;
    const gapLogos = 20;

    const noLogo = (x: number, y: number, nom: string) => {
        doc.font("Helvetica-Oblique");
        doc.fillColor("#DDD").rect(x, y, 140, 60).fill();
        doc.fillColor("#000").fontSize(10).text(`Aucun visuel pour ${nom}\nimporté via les paramètres\n(accueil > paramètres)`, x + 5, y + 5);
    };

    const univTaille = 140;
    const facTaille = 140;
    const totalTaille = univTaille + facTaille + gapLogos;

    if (universite) {
        const x = (doc.page.width - totalTaille) / 2;
        doc.image(universite.buffer, x, margeHaut, { width: universite.width, height: universite.height, fit: [140, 80], align: "right", valign: "center" });
    } else {
        noLogo((doc.page.width - totalTaille) / 2, margeHaut, "l'université");
    }

    if (faculte) {
        const x = (doc.page.width - totalTaille) / 2 + univTaille + gapLogos;
        doc.image(faculte.buffer, x, margeHaut, { width: faculte.width, height: faculte.height, fit: [140, 80], valign: "center" });
    } else {
        noLogo((doc.page.width - totalTaille) / 2 + univTaille + gapLogos, margeHaut, "la faculté");
    }

}