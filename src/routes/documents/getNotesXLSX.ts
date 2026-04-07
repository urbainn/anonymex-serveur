import { sessionCache } from "../../cache/sessions/SessionCache"
import XLSX from "@e965/xlsx";
import { ErreurRequeteInvalide } from "../erreursApi"
import { logInfo } from "../../utils/logger";
import { Response } from 'express';

export interface formatExport {
    code_anonymat: string,
    numero_etudiant: string,
    note: number
}

export async function getNotesXLSX(sessionId: string, codeEpreuve: string, res: Response): Promise<void> {

    const idSession = parseInt(sessionId ?? '');
    if (isNaN(idSession)) throw new ErreurRequeteInvalide("L'id de la session est invalide.");

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) throw new ErreurRequeteInvalide("Session introuvable.");

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (!epreuve) throw new ErreurRequeteInvalide("Épreuve introuvable.");

    const convocations = await epreuve.convocations.getAll();

    const tableauExport: formatExport[] = [];

    for (const convocation of convocations) {

        const noteExport = convocation.noteQuart;
        const codeAnonymatExport = convocation.codeAnonymat;
        const numeroEtudiantExport = convocation.numeroEtudiant?.toString() ?? "";

        if (noteExport != null) {
            tableauExport.push({
                code_anonymat: codeAnonymatExport,
                numero_etudiant: numeroEtudiantExport,
                note: noteExport / 4
            });
        }
    }

    const convocationsSupplementaires = epreuve.convocations.convocationsSupplementaires.values();

    for (const convocationSupplementaire of convocationsSupplementaires) {

        const noteExport = convocationSupplementaire.noteQuart;
        const codeAnonymatExport = convocationSupplementaire.codeAnonymat;
        const numeroEtudiantExport = convocationSupplementaire.numeroEtudiant?.toString() ?? "";

        if (codeAnonymatExport.startsWith("Z")) {
            if (noteExport != null) {
                tableauExport.push({
                    code_anonymat: codeAnonymatExport,
                    numero_etudiant: numeroEtudiantExport,
                    note: noteExport / 4
                });
            }
        }

    }

    if (tableauExport.length === 0) {
        throw new ErreurRequeteInvalide("Aucune note n'est disponible pour cette épreuve.");
    }

    logInfo("serveur", `Génération de ${tableauExport.length} lignes pour export-notes-${codeEpreuve}.xlsx`);

    const feuille = XLSX.utils.json_to_sheet(tableauExport);
    const classeur = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(classeur, feuille, "Notes");

    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader(
        'Content-Disposition',
        `attachment; filename="export-notes-${codeEpreuve}.xlsx"`
    );

    res.send(buffer);
}