import { Response } from 'express';
import XLSX from "@e965/xlsx";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { logInfo } from "../../utils/logger";
import { ErreurRequeteInvalide } from "../erreursApi";

export interface formatExport {
    code_anonymat: string,
    numero_etudiant: string
    code_epreuve: string,
    note: number | null
}

export async function getCorrespondance(sessionId: string, format: string, res: Response): Promise<void> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession) || sessionId === undefined) {
        throw new ErreurRequeteInvalide("La session demandé est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("La session demandé n'existe pas.");
    }

    const epreuves = await session.epreuves.getAll();

    const tableauExport: formatExport[] = [];

    for (const epreuve of epreuves) {

        const convocations = await epreuve.convocations.getAll();

        const totalConvocations = [
            ...convocations,
            ...Array.from(epreuve.convocations.convocationsSupplementaires.values())
        ];

        for (const convocation of totalConvocations) {
            const codeAnonymatExport = convocation.codeAnonymat;
            const numeroEtudiantExport = convocation.numeroEtudiant?.toString() ?? "";
            const codeEpreuveExport = convocation.codeEpreuve;
            const noteExport = typeof convocation.noteQuart === 'number' ? convocation.noteQuart / 4 : null;
                      
            tableauExport.push({
                code_anonymat: codeAnonymatExport,
                numero_etudiant: numeroEtudiantExport,
                code_epreuve: codeEpreuveExport,
                note: noteExport
            });

        }
    }

    if (tableauExport.length === 0) {
        throw new ErreurRequeteInvalide("Aucune donnée n'est disponible pour cette session.");
    }

    const estCsv = format?.toLowerCase() === 'csv';
    const extension = estCsv ? 'csv' : 'xlsx';

    const sessionNom = session.nom.split(' ').join('-');

    logInfo("serveur", `Génération de ${tableauExport.length} lignes pour correspondances-${sessionNom}-${session.annee}.${extension}`);

    const feuille = XLSX.utils.json_to_sheet(tableauExport);
    const classeur = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(classeur, feuille, "Correspondances");

    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: estCsv ? 'csv' : 'xlsx' });

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="correspondances-${sessionNom}-${session.annee}.${extension}"`
    );

    res.send(buffer);
}