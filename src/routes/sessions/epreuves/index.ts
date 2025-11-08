import { Router } from "express";
import { useRest } from "../../useRest";
import { getEpreuves } from "./getEpreuves";
const epreuvesRouter = Router();

// GET /sessions/:session/epreuves/
epreuvesRouter.get("/", (req, res) => useRest(getEpreuves, req, res));

export { epreuvesRouter };