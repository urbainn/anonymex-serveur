import { Canvas, createCanvas } from "canvas";
import { getDocument, OPS, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ErreurConversion, ErreurPdfIncompatible } from "../../lectureErreurs";

/**
 * (à utiliser dans le parent plutot que dans ce fichier -> TODO)
 * @param pdfPath 
 */
export async function pdfToCanvas_WIP(pdfPath: string) {
    // Charger le document PDF
    const pdf = await getDocument(pdfPath).promise;
    const nbPages = pdf.numPages;

    // Charger et faire un rendu de chaque page
    for (let pageNum = 1; pageNum <= nbPages; pageNum++) {
        await pdfToBuffer(pdf, pageNum);
    }
}

/**
 * Extrait les images d'un scan PDF et renvoit un tableau d'octets GREYSCALE prêt à la lecture.\
 * **Note:** n'extrait QUE les images, afin d'éviter la conversion pdf -> CanvasHTML -> rastérisation.
 * Si le PDF n'est pas compatible, une `ErreurPdfIncompatible` est levée.
 * @param pdf 
 * @param pageNum 
 */
export async function pdfToBuffer(pdf: PDFDocumentProxy, pageNum: number): Promise<Uint8ClampedArray> {

    if (pageNum < 1 || pageNum > pdf.numPages) {
        throw new ErreurConversion('Numéro de page invalide pour le PDF fourni.');
    }

    // Basé sur https://github.com/bangbang93/node-pdf-extract-image/blob/master/src/index.ts par bangbang93
    const page = await pdf.getPage(pageNum);
    const ops = await page.getOperatorList();

    // On extrait uniquement l'image la plus grande de la page (en supposant que c'est le scan)
    let largestImgNom: string | null = null;
    let largestImgAire = 0;

    for (let j = 0; j < ops.fnArray.length; j++) {
        if (ops.fnArray[j] === OPS.paintImageXObject) {
            const args = ops.argsArray[j] as unknown[];
            const imgName = args[0] as string;
            const imgObj = page.objs.get(imgName) as NodeJS.Dict<unknown>;
            const { width, height, data: imgData } = imgObj;
            if (!(imgData instanceof Uint8ClampedArray) || typeof width !== 'number' || typeof height !== 'number') continue;

            // Image la plus grande ?
            const imgAire = width * height;
            if (imgAire > largestImgAire) {
                largestImgAire = imgAire;
                largestImgNom = imgName;
            }
        }
    }

    if (!largestImgNom) {
        throw new ErreurPdfIncompatible('Aucune image trouvée sur la page du PDF.');
    }

    // Récupérer l'image la plus grande et convertir en image valide
    const imgObj = page.objs.get(largestImgNom) as ImageData;
    if (!imgObj || !(imgObj.data instanceof Uint8ClampedArray)) {
        throw new ErreurPdfIncompatible('L\'image extraite du PDF est dans un format incompatible.');
    }

    return imgObj.data;
}
