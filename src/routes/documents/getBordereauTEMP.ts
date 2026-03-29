import { Response } from "express";
import PDFDocument from 'pdfkit';
import { genererPageBordereau } from "../../core/generation/bordereau/genererBordereau";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";
import { ModeleBordereau } from "../../core/generation/bordereau/modeleBordereau";

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
    const convocs = await epreuve.convocations.getAll();

    // générer n numéros de pages sur lesquels creer un incident aleatoirement
    const pagesIncidents = new Set<number>();
    while (pagesIncidents.size < nbIncidentsNum) {
        const page = Math.floor(Math.random() * convocs.length);
        pagesIncidents.add(page);
    }

    console.log(`Pages avec incidents : ${[...pagesIncidents].join(", ")}`);

    let il = 0;
    for (const convoc of convocs) {
        await genererPageBordereau(doc);

        const incident = pagesIncidents.has(il);

        const positions = ModeleBordereau.getPositionsCadresAnonymat();
        for (let i = 0; i < convoc.codeAnonymat.length && i < positions.length; i++) {
            const char = convoc.codeAnonymat[i];
            const pos = positions[i];

            if (char && pos && (!incident || (i !== 4 && i !== 1))) {
                doc.font("Helvetica-Bold")
                    .fontSize(25)
                    .fillColor("#222")
                    .text(char, pos.x + 10, pos.y + 13);
            }
        }

        // Cocher une note entre 0 et 20
        const positionsNotes = ModeleBordereau.getPositionsCasesNote();
        const note = Math.floor(Math.random() * 21);

        if (positionsNotes.notes[note]) {
            const caseNote = positionsNotes.notes[note];
            doc.roundedRect(caseNote.x, caseNote.y, caseNote.largeur, caseNote.hauteur, 3).fill("#333");
        }

        // Cocher fraction une fois sur 3
        const fraction = Math.round(Math.random() * 3);
        if (note < 20 && Math.random() < 0.3 && positionsNotes.fractions[fraction]) {
            const caseFraction = positionsNotes.fractions[fraction];
            doc.roundedRect(caseFraction.x, caseFraction.y, caseFraction.largeur, caseFraction.hauteur, 3).fill("#333");
        }

        il++;
    }

    doc.end();
}