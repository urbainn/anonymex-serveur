import { Request } from "express";
import { sessionCache } from "../../cache/sessions/SessionCache";
import { ErreurRequeteInvalide } from "../erreursApi";
import { APIBoolResponse } from "../../contracts/common";
import { interpretationXLSX } from "../../core/xlsx/interpretationXLSX";
import { lectureXLSX } from "../../core/xlsx/lectureXLSX";
import { ErreurInterpretationXLSX, ErreurLectureXLSX } from "../../core/xlsx/ErreursXLSX";

export async function postImporterFichierSession(req: Request): Promise<APIBoolResponse> {
    const { id } = req.params;
    const idSession = parseInt(id ?? '');

    if (isNaN(idSession) || id === undefined)
        throw new ErreurRequeteInvalide("L'ID de session n'est pas valide.");

    const session = await sessionCache.getOrFetch(idSession);
    if (!session)
        throw new ErreurRequeteInvalide("La session n'existe pas.");

    // Vérifier si le fichier à bien été reçu
    if (!req.body.fichiers || !Array.isArray(req.body.fichiers))
        throw new ErreurRequeteInvalide("Aucun fichier n'a été reçu.");

    if (req.body.fichiers.length !== 1)
        throw new ErreurRequeteInvalide("Veuillez envoyer un unique fichier XLSX.");

    // Lecture du fichier
    try {
        const donnees = lectureXLSX(req.body.fichiers[0].buffer);

        // Interpretation des données
        try {
            await interpretationXLSX(donnees, session);
        } catch (err) {
            throw ErreurInterpretationXLSX.assigner(err);
        }

    } catch (err) {
        throw ErreurLectureXLSX.assigner(err);
    }

    return { success: true };
}