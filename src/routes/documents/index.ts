import { Router } from "express";
import { useFullRest } from "../useRest";
import { getBordereau } from "./getBordereau";
import { getCoupons } from "./getCoupons";

const documentsRouter = Router();

// GET /documents/bordereau.pdf
documentsRouter.get("/bordereau.pdf", (req, res) => useFullRest(() => getBordereau(res), req, res));

// GET /documents/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf?salles=SALLE1,SALLE2
documentsRouter.get("/session/:sessionId/epreuve/:codeEpreuve/coupons.pdf", (req, res) => {
    const { sessionId, codeEpreuve } = req.params;
    const salles = (req.query.salles as string)?.split(",") ?? [];
    return useFullRest(() => getCoupons(sessionId, codeEpreuve, salles, res), req, res);
});

export { documentsRouter as documentsRouter };