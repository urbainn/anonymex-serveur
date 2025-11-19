import XLSX from "@e965/xlsx";
import { readFileSync } from 'fs';
import { ErreurConversion } from "../lecture/lectureErreurs";

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

export function lectureXLSX(chemin: string): SheetData[] {
    let workbook;
    try {
        const buffer = readFileSync(chemin);
        workbook = XLSX.read(buffer);
    } catch(err) {
        throw ErreurConversion.assigner(err);
    }
    const sheetName = workbook.SheetNames[0]
    if(!sheetName) {
        throw new ErreurConversion("Le fichier XLSX ne contient aucune feuille.")
    }
        
    const worksheet = workbook.Sheets[sheetName]
    if(!worksheet) {
        throw new ErreurConversion("Erreur lors de la lecture de la feuille.")
    }

    const contenu = XLSX.utils.sheet_to_json<SheetData>(worksheet);
    return contenu;
}