import { Router } from "express";
import { useFullRest } from "../useRest";
import { getBordereau } from "./getBordereau";
import { getCoupons } from "./getCoupons";
import { getScanIncident } from "./getScanIncident";
import { getBordereauTemp } from "./getBordereauTEMP";
import { getNotesXLSX } from "./getNotesXLSX";
import { getCorrespondance } from "./getCorrespondance";

const documentsRouter = Router();

// GET /documents/bordereau.pdf
documentsRouter.get("/bordereau.pdf", (req, res) => useFullRest(() => getBordereau(res), req, res));

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf?salles=SALLE1,SALLE2
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf", (req, res) => {
    const { sessionId, codeEpreuve } = req.params;
    const salles = (req.query.salles as string)?.split(",") ?? [];
    return useFullRest(() => getCoupons(sessionId, codeEpreuve, salles, res), req, res);
});

// GET /documents/incidents/:idIncident/scan.webp
documentsRouter.get("/incidents/:idIncident/scan.webp", (req, res) => {
    const { idIncident } = req.params;
    return useFullRest(() => getScanIncident(idIncident, res), req, res);
});

// GET /documents/magacha/:sessionId/:codeEpreuve/:nbIncidents
documentsRouter.get("/magacha/:sessionId/:codeEpreuve/:nbIncidents", (req, res) => {
    const { sessionId, codeEpreuve, nbIncidents } = req.params;
    return useFullRest(() => getBordereauTemp(sessionId, codeEpreuve, nbIncidents, res), req, res);
});

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/notes?format=csv
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/notes", (req, res) => {
    const { sessionId, codeEpreuve } = req.params;
    const format = req.query.format as string;
    return useFullRest(async () => await getNotesXLSX(sessionId, codeEpreuve, format, res), req, res);
});

// GET /documents/session/:sessionId/correspondance?format=csv
documentsRouter.get("/session/:sessionId/correspondance", (req, res) => {
    const { sessionId } = req.params;
    const format = req.query.format as string;
    return useFullRest(async () => await getCorrespondance(sessionId, format, res), req, res);
});

export { documentsRouter as documentsRouter };