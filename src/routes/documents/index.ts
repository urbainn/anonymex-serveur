import { Router } from "express";
import { useFullRest } from "../useRest";
import { getBordereau } from "./getBordereau";
import { getCoupons } from "./getCoupons";
import { getScanBordereau, getScanIncident } from "./getScan";
import { getBordereauTemp } from "./getBordereauTEMP";
import { getNotesXLSX } from "./getNotesXLSX";
import { getCorrespondance } from "./getCorrespondance";
import { getCreerCouponsSupplementaires } from "./getCreerCouponsSupplementaires";
import { getCouponsAvecScans } from "./getCouponsAvecScans";

const documentsRouter = Router();

// GET /documents/bordereau.pdf
documentsRouter.get("/bordereau.pdf", (req, res) => useFullRest(() => getBordereau(res), req, res));

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf?salles=SALLE1,SALLE2&codes=CODE1,CODE2
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf", (req, res) => {
    const { sessionId, codeEpreuve } = req.params;
    const salles = (req.query.salles as string)?.split(",") ?? [];
    const codesAno = (req.query.codes as string)?.split(",") ?? [];
    return useFullRest(() => getCoupons(sessionId, codeEpreuve, codesAno, salles, res), req, res);
});

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/convocations-scans.pdf?codes=CODE1,CODE2
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/convocations-scans.pdf", (req, res) => {
    const { sessionId, codeEpreuve } = req.params;
    const codesAno = (req.query.codes as string)?.split(",") ?? [];
    return useFullRest(() => getCouponsAvecScans(sessionId, codeEpreuve, codesAno, res), req, res);
});

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/salle/:salle/creer-coupons-supplementaires?nbCoupons=N
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/salle/:salle/creer-coupons-supplementaires", (req, res) => {
    const { sessionId, codeEpreuve, salle } = req.params;
    const nbCoupons = parseInt(req.query.nbCoupons as string, 10);
    return useFullRest(() => getCreerCouponsSupplementaires(sessionId, codeEpreuve, salle, nbCoupons, res), req, res);
});

// GET /documents/scans/:sessionId/incidents/:idIncident/scan.webp
documentsRouter.get("/scans/:sessionId/incidents/:idIncident/scan.webp", (req, res) => {
    const { sessionId, idIncident } = req.params;
    return useFullRest(() => getScanIncident(sessionId, idIncident, res), req, res);
});

// GET /documents/scans/:sessionId/epreuve/:codeEpreuve/:codeAnonymat/scan.webp
documentsRouter.get("/scans/:sessionId/epreuve/:codeEpreuve/:codeAnonymat/scan.webp", (req, res) => {
    const { sessionId, codeEpreuve, codeAnonymat } = req.params;
    return useFullRest(() => getScanBordereau(sessionId, codeEpreuve, codeAnonymat, res), req, res);
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