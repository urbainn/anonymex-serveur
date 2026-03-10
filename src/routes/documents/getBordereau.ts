import { Response } from "express";
import { genererBordereau } from "../../core/generation/bordereau/genererBordereau";

export async function getBordereau(res: Response): Promise<void> {
    // Générer le bordereau
    genererBordereau({
        format: "A4",
        longueurCodeAnonymat: 6,
        longueurCodeEpreuve: 0,
        version: 1
    }, res);
}