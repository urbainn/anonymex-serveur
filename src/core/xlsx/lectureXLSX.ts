import XLSX from "@e965/xlsx";
import { readFileSync } from 'fs';
import { ErreurConversion } from "../lecture/lectureErreurs";
import { ErreurLectureXLSX } from "./ErreursXLSX";

export interface SheetData {
    DAT_DEB_PES: string,
    HORAIRE: string,
    COD_SAL: string,
    COD_EPR: string,
    COD_RES: string,
    LIC_RES: string,
    LIB_TYP: string,
    COD_SES: string,
    COD_ADM: string,
    TRI: number,
    LIB_PR1_IND: string,
    LIB_NOM_PAT_IND: string,
    COD_ETU_ANO: string,
    COD_ETU: string,
    C_COD_ANU: string,
    C_RES: number
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