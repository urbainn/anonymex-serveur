import { OPS, PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import { ErreurConversion, ErreurPdfIncompatible } from "../../lectureErreurs";
import { ScanData } from "../extraireScans";
import { StatistiquesDebug } from "../../../../core/debug/StatistiquesDebug";
import { EtapeLecture } from "../../../../core/debug/EtapesDeTraitementDicts";
import { LecturePipelineDebug } from "../../../../core/debug/LecturePipelineDebug";

/**
 * Extrait les images d'un scan PDF et renvoit un tableau d'octets GREYSCALE prêt à la lecture.\
 * **Note:** n'extrait QUE les images, afin d'éviter la conversion pdf -> CanvasHTML -> rastérisation.
 * Si le PDF n'est pas compatible, une `ErreurPdfIncompatible` est levée.
 * @param pdf 
 * @param pageNum 
 */
export async function pdfToBuffer(pdf: PDFDocumentProxy, pageNum: number): Promise<[ScanData, Uint8ClampedArray | Uint8Array]> {

    if (pageNum < 1 || pageNum > pdf.numPages) {
        throw new ErreurConversion('Numéro de page invalide pour le PDF fourni.');
    }

    const debutMs = Date.now();

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

            if (!((imgData instanceof Uint8ClampedArray) || (imgData instanceof Uint8Array)) // image est un buffer?
                || typeof width !== 'number' || typeof height !== 'number') continue; // format incompatible

            // Est l'image la plus grande ?
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
    const imgObj = page.objs.get(largestImgNom);

    if (!imgObj) {
        throw new ErreurPdfIncompatible('L\'image extraite du PDF est dans un format incompatible.');
    }

    // 'kind' indique le format des données, 1 = greyscale sur 1 canal, 2 = RGB sur 3 canaux, 3 = RGBA sur 4 canaux
    const canaux = imgObj.kind === 1 ? 1 : imgObj.kind === 2 ? 3 : 4;

    // Si l'image est de type 1, alors les données sont sûrement packées (1 bit par pixel).
    // Sharp ne sait pas lire ce format; on décompacte donc en niveaux de gris 8 bits.
    let data: Uint8Array | Uint8ClampedArray;
    if (imgObj.kind === 1) {
        // Décompactage des données 1bpp en 8bpp
        const imgData = imgObj.data as Uint8Array;
        data = new Uint8ClampedArray(imgObj.width * imgObj.height);
        for (let i = 0; i < imgData.length; i++) {
            const byte = imgData[i]!;
            for (let bit = 0; bit < 8; bit++) {
                const pixel = (byte >> (7 - bit)) & 1;
                data[i * 8 + bit] = pixel * 255; // 1bpp -> 8bpp
            }
        }
    } else {
        data = imgObj.data;
    }

    const scanData: ScanData = {
        width: imgObj.width,
        height: imgObj.height,
        channels: canaux,
        debug: pageNum === 1,
        raw: true
    };

    // Statistiques & outils de débuggage
    StatistiquesDebug.ajouterTempsExecution(EtapeLecture.EXTRACTION_SCAN, Date.now() - debutMs);
    if (scanData.debug) LecturePipelineDebug.enregistrerImageDebugRaw(EtapeLecture.EXTRACTION_SCAN, data, scanData.width, scanData.height, scanData.channels);

    return [scanData, data];
}
