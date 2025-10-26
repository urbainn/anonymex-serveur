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
        await pdfToCanvas(pdf, pageNum);
    }
}

/**
 * Extrait les images d'un scan PDF et renvoit un Canvas prêt à la lecture.\
 * **Note:** n'extrait QUE les images, afin d'éviter la conversion pdf -> CanvasHTML -> rastérisation -> Canvas.
 * Si le PDF n'est pas compatible, une `ErreurPdfIncompatible` est levée.
 * @param pdf 
 * @param pageNum 
 */
export async function pdfToCanvas(pdf: PDFDocumentProxy, pageNum: number): Promise<Canvas> {

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
    const imgObj = page.objs.get(largestImgNom) as NodeJS.Dict<unknown>;
    if (!imgObj || !(imgObj.data instanceof Uint8ClampedArray)) {
        throw new ErreurPdfIncompatible('L\'image extraite du PDF est dans un format incompatible.');
    }

    const rgbaData = new Uint8ClampedArray((imgObj.data.length / 3) * 4);
    const imgData = imgObj.data as Uint8ClampedArray;
    for (let i = 0, j = 0; i < imgData.length; i += 3, j += 4) {
        rgbaData[j] = imgData[i]!;
        rgbaData[j + 1] = imgData[i + 1]!;
        rgbaData[j + 2] = imgData[i + 2]!;
        rgbaData[j + 3] = 255;
    }

    // Créer le canvas et y dessiner l'image
    const canvas = createCanvas(imgObj.width as number, imgObj.height as number);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(imgObj.width as number, imgObj.height as number);
    imageData.data.set(rgbaData);
    ctx.putImageData(imageData, 0, 0);

    console.log(canvas.toDataURL());

    return canvas;
}
