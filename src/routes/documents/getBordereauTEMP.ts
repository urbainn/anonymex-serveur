import { Response } from "express";
import path from "path";
import PDFDocument from 'pdfkit';
import sharp from "sharp";
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, CanvasRenderingContext2D as NodeCanvasRenderingContext2D, DOMMatrix, Image, ImageData } from 'canvas';
import { Path2D, applyPath2DToCanvasRenderingContext } from 'path2d';
import { genererPageBordereau } from "../../core/generation/bordereau/genererBordereau";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";
import { ModeleBordereau } from "../../core/generation/bordereau/modeleBordereau";

const A4_WIDTH_POINTS = 595.28;
const A4_HEIGHT_POINTS = 841.89;
const RASTER_SCALE = 2;
const PDFJS_STANDARD_FONT_DATA_URL = `${path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts")}${path.sep}`;
let canvasPath2DPatched = false;
let canvasGlobalsPatched = false;

type NodeCanvas = ReturnType<typeof createCanvas>;
interface CanvasAndContext {
    canvas: NodeCanvas;
    context: NodeCanvasRenderingContext2D;
}

class NodeCanvasFactoryCompat {
    create(width: number, height: number): CanvasAndContext {
        if (width <= 0 || height <= 0) {
            throw new Error('Largeur/hauteur de canvas invalides pour le rendu PDF.');
        }

        const canvas = createCanvas(Math.ceil(width), Math.ceil(height));
        const context = canvas.getContext('2d');
        return { canvas, context };
    }

    reset(canvasAndContext: CanvasAndContext, width: number, height: number): void {
        if (width <= 0 || height <= 0) {
            throw new Error('Largeur/hauteur de canvas invalides pour le rendu PDF.');
        }

        canvasAndContext.canvas.width = Math.ceil(width);
        canvasAndContext.canvas.height = Math.ceil(height);
    }

    destroy(canvasAndContext: CanvasAndContext): void {
        canvasAndContext.canvas.width = 0;
        canvasAndContext.canvas.height = 0;
    }
}

function ensureCanvasPath2DSupport(): void {
    if (canvasPath2DPatched) {
        return;
    }

    applyPath2DToCanvasRenderingContext(NodeCanvasRenderingContext2D as unknown as never);
    (globalThis as unknown as { Path2D: typeof Path2D }).Path2D = Path2D;
    canvasPath2DPatched = true;
}

function ensureCanvasGlobalsSupport(): void {
    if (canvasGlobalsPatched) {
        return;
    }

    const globals = globalThis as unknown as {
        DOMMatrix?: typeof DOMMatrix;
        Image?: typeof Image;
        ImageData?: typeof ImageData;
    };

    if (!globals.DOMMatrix) {
        globals.DOMMatrix = DOMMatrix;
    }
    if (!globals.Image) {
        globals.Image = Image;
    }
    if (!globals.ImageData) {
        globals.ImageData = ImageData;
    }

    canvasGlobalsPatched = true;
}

function remplirDonneesBordereau(doc: PDFKit.PDFDocument, codeAnonymat: string, incident: boolean): void {

    // si incident, choisir le type d'incident:
    // 0 = code invalide
    // 1 = plusieurs notes
    // 2 = absence de note
    // 3 = coche "erreur"
    // 4 = plueurs fractionsc
    const typeIncident = incident ? Math.floor(Math.random() * 5) : null;

    const positions = ModeleBordereau.getPositionsCadresAnonymat();
    for (let i = 0; i < codeAnonymat.length && i < positions.length; i++) {
        const char = codeAnonymat[i];
        const pos = positions[i];

        if (char && pos && (!(typeIncident === 0) || (i !== 4 && i !== 1))) {
            doc.font("Helvetica-Bold")
                .fontSize(25)
                .fillColor("#222")
                .text(char, pos.x + 10, pos.y + 13);
        }
    }

    const positionsNotes = ModeleBordereau.getPositionsCasesNote();
    const note = Math.floor(Math.random() * 21);

    if (typeIncident !== 2) {
        if (positionsNotes.notes[note]) {
            const caseNote = positionsNotes.notes[note];
            doc.roundedRect(caseNote.x, caseNote.y, caseNote.largeur, caseNote.hauteur, 3).fill("#333");

            if (typeIncident === 1) {
                const autreNote = note > 10 ? note - 5 : note + 5;
                if (positionsNotes.notes[autreNote]) {
                    const caseAutreNote = positionsNotes.notes[autreNote];
                    doc.roundedRect(caseAutreNote.x, caseAutreNote.y, caseAutreNote.largeur, caseAutreNote.hauteur, 3).fill("#333");
                }
            }
        }
    }

    const fraction = Math.round(Math.random() * 3);
    if (note < 20 && Math.random() < 0.3 && positionsNotes.fractions[fraction]) {
        const caseFraction = positionsNotes.fractions[fraction];
        doc.roundedRect(caseFraction.x, caseFraction.y, caseFraction.largeur, caseFraction.hauteur, 3).fill("#333");
        if (typeIncident === 4) {
            const autreFraction = fraction === 0 ? 1 : 0;
            if (positionsNotes.fractions[autreFraction]) {
                const caseAutreFraction = positionsNotes.fractions[autreFraction];
                doc.roundedRect(caseAutreFraction.x, caseAutreFraction.y, caseAutreFraction.largeur, caseAutreFraction.hauteur, 3).fill("#333");
            }
        }
    }

    if (typeIncident === 3) {
        const caseErreur = positionsNotes.caseErreur;
        doc.roundedRect(caseErreur.x, caseErreur.y, caseErreur.largeur, caseErreur.hauteur, 3).fill("#333");
    }

}

async function pdfDocumentToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        doc.on("data", (chunk: Buffer | Uint8Array) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.end();
    });
}

function getRotationDeg(pageIndex: number): number {
    if (pageIndex % 5 === 0) {
        return (Math.random() * 3.2) - 1.6;
    }
    return Math.random() < 0.25 ? (Math.random() * 2.4) - 1.2 : 0;
}

async function rendrePdfEnPng(pagePdfBuffer: Buffer): Promise<Buffer> {
    ensureCanvasPath2DSupport();
    ensureCanvasGlobalsSupport();

    const loadingTask = getDocument({
        data: new Uint8Array(pagePdfBuffer),
        standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
        CanvasFactory: NodeCanvasFactoryCompat,
    });
    const pdf = await loadingTask.promise;

    try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: RASTER_SCALE });

        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));

        await page.render({
            canvas: canvas as unknown as HTMLCanvasElement,
            viewport
        }).promise;

        return canvas.toBuffer('image/png');
    } finally {
        await pdf.destroy();
    }
}

async function genererImagePageBordereau(codeAnonymat: string, incident: boolean, pageIndex: number): Promise<Buffer> {
    const docTemp = new PDFDocument({
        size: 'A4',
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    await genererPageBordereau(docTemp);
    remplirDonneesBordereau(docTemp, codeAnonymat, incident);

    const pagePdfBuffer = await pdfDocumentToBuffer(docTemp);
    console.log('ok rendu pdf');
    const pagePngBuffer = await rendrePdfEnPng(pagePdfBuffer);
    console.log('ok rendu png');
    const rotation = getRotationDeg(pageIndex);

    return sharp(pagePngBuffer)
        .flatten({ background: "#ffffff" })
        .rotate(rotation, { background: "#f8f8f8" })
        .modulate({ brightness: 0.985, saturation: 0.92 })
        .resize(Math.round(A4_WIDTH_POINTS * RASTER_SCALE), Math.round(A4_HEIGHT_POINTS * RASTER_SCALE), {
            fit: "contain",
            background: "#f3f3f3"
        })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
}

export async function getBordereauTemp(sessionId: string, codeEpreuve: string, nbIncidents: string, res: Response): Promise<void> {

    const idSession = parseInt(sessionId ?? '');
    const nbIncidentsNum = parseInt(nbIncidents ?? '');

    if (isNaN(nbIncidentsNum) || nbIncidentsNum < 0 || nbIncidents === undefined) {
        throw new ErreurRequeteInvalide("Le nombre d'incidents n'est pas valide.");
    }

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");
    }

    const session = await sessionCache.getOrFetch(idSession);

    if (session === undefined) {
        throw new ErreurRequeteInvalide("La session demandée n'existe pas.");
    }

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);

    if (epreuve === undefined) {
        throw new ErreurRequeteInvalide("L'épreuve demandée n'existe pas.");
    }

    const doc = new PDFDocument({
        size: 'A4',
        autoFirstPage: false,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    doc.pipe(res);
    await session.epreuves.getAll();
    const convocs = await epreuve.convocations.getAll();

    // générer n numéros de pages sur lesquels creer un incident aleatoirement
    const nbIncidentsCibles = Math.min(nbIncidentsNum, convocs.length);
    const pagesIncidents = new Set<number>();
    while (pagesIncidents.size < nbIncidentsCibles) {
        const page = Math.floor(Math.random() * convocs.length);
        pagesIncidents.add(page);
    }

    console.log(`Pages avec incidents : ${[...pagesIncidents].join(", ")}`);

    let il = 0;
    for (const convoc of convocs) {
        const incident = pagesIncidents.has(il);
        const imagePage = await genererImagePageBordereau(convoc.codeAnonymat, incident, il);

        doc.addPage();
        if (imagePage.length > 0) {
            console.log(imagePage)
            doc.image(imagePage, 0, 0, {
                width: doc.page.width,
                height: doc.page.height
            });
        }
        il++;
    }

    doc.end();
}