import { sessionCache } from "../../cache/sessions/SessionCache"
import XLSX from "@e965/xlsx";
import { ErreurRequeteInvalide } from "../erreursApi"
import { logInfo } from "../../utils/logger";
import { Response } from 'express';

export interface formatExport {
    code_anonymat: string,
    numero_etudiant: string,
    note: number | string
}

export async function getNotesXLSX(sessionId: string, codeEpreuve: string, format: string, res: Response): Promise<void> {

    const idSession = parseInt(sessionId ?? '');
    if (isNaN(idSession)) throw new ErreurRequeteInvalide("L'id de la session est invalide.");

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) throw new ErreurRequeteInvalide("Session introuvable.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (!epreuve) throw new ErreurRequeteInvalide("Épreuve introuvable.");

    const convocations = await epreuve.convocations.getAll();

    const totalConvocations = [
        ...convocations,
        ...Array.from(epreuve.convocations.convocationsSupplementaires.values())
    ];

    const tableauExport: formatExport[] = [];

    for (const convocation of totalConvocations) {

        const noteExport = typeof convocation.noteQuart === 'number' ? convocation.noteQuart / 4 : "";
        const codeAnonymatExport = convocation.codeAnonymat;
        const numeroEtudiantExport = convocation.numeroEtudiant?.toString() ?? "";

        tableauExport.push({
            code_anonymat: codeAnonymatExport,
            numero_etudiant: numeroEtudiantExport,
            note: noteExport
        });
    }

    if (tableauExport.length === 0) {
        throw new ErreurRequeteInvalide("Aucune note n'est disponible pour cette épreuve.");
    }

    const estCsv = format?.toLowerCase() === 'csv';
    const extension = estCsv ? 'csv' : 'xlsx';

    logInfo("serveur", `Génération de ${tableauExport.length} lignes pour export-notes-${codeEpreuve}.${extension}`);

    const feuille = XLSX.utils.json_to_sheet(tableauExport);
    const classeur = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(classeur, feuille, "Notes");

    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: estCsv ? 'csv' : 'xlsx' });

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="export-notes-${codeEpreuve}.${extension}"`
    );

    res.send(buffer);
}