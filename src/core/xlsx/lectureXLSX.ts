import XLSX from "@e965/xlsx";
import { ErreurLectureXLSX } from "./ErreursXLSX";

export interface SheetData {
    DAT_DEB_PES: string,
    HORAIRE: string,
    COD_EPR: string,
    HEURE_FIN: string,
    DUREE_EXA: string,
    COD_SAL: string,
    LIB_SAL: string,
    COD_BAT: string,
    LIB_BAT: string,
    NUM_PLC_AFF_PSI: string,
    LIB_NOM_PAT_IND: string,
    LIB_PR1_IND: string,
    COD_ETU: string
}

export function lectureXLSX(buffer: Buffer): Record<string, unknown>[] {
    let workbook;
    try {
        workbook = XLSX.read(buffer);
    } catch (err) {
        throw ErreurLectureXLSX.assigner(err);
    }
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
        throw new ErreurLectureXLSX("Le fichier XLSX ne contient aucune feuille.")
    }

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
        throw new ErreurLectureXLSX("Erreur lors de la lecture de la feuille " + sheetName + " (non trouvée).")
    }

    const contenu = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
    return contenu;
}