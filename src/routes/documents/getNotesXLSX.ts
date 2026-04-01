import { sessionCache } from "../../cache/sessions/SessionCache"
import XLSX from "@e965/xlsx";
import { ErreurRequeteInvalide } from "../erreursApi"
import { logInfo } from "../../utils/logger";

export interface formatExport {
    code_anonymat: string,
    numero_etudiant: string,
    note: number
}

export async function getNotesXLSX(sessionId: string, codeEpreuve: string): Promise<Buffer> {

    const idSession = parseInt(sessionId ?? '');

    if (isNaN(idSession)) {
        throw new ErreurRequeteInvalide("L'id de la session est invalide.");
    }

    const session = await sessionCache.getOrFetch(idSession);
    if (!session) {
        throw new ErreurRequeteInvalide("Session introuvable.");
    } 

    const epreuve = await session.epreuves.getOrFetch(codeEpreuve);
    if (!epreuve) {
        throw new ErreurRequeteInvalide("Épreuve introuvable.");
    } 

    const convocations = await epreuve.convocations.getAll();

    const tableauExport: formatExport[] = [];

    for (const convocation of convocations) {

        const codeAnonymatExport = convocation.codeAnonymat.toString();
        const numeroEtudiantExport = convocation.numeroEtudiant?.toString() ?? "null";
        const noteExport = convocation.noteQuart;

        if(noteExport != null) {
            tableauExport.push({
            code_anonymat: codeAnonymatExport,
            numero_etudiant: numeroEtudiantExport,
            note: noteExport / 4
        });
        }
    }

    logInfo("serveur", `Génération de ${tableauExport.length} lignes pour export-notes-${codeEpreuve}.xlsx`);

    if (tableauExport.length === 0) {
        throw new ErreurRequeteInvalide("Aucune note n'est disponible pour cette épreuve.");
    }

    const feuille = XLSX.utils.json_to_sheet(tableauExport);
    const classeur = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(classeur, feuille, "Notes");

    const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });

    return buffer as Buffer;
}