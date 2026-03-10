import { Router } from "express";
import { useFullRest } from "../useRest";
import { getBordereau } from "./getBordereau";

const documentsRouter = Router();

// GET /documents/bordereau.pdf
documentsRouter.get("/bordereau.pdf", (req, res) => useFullRest(() => getBordereau(res), req, res));

export { documentsRouter as documentsRouter };