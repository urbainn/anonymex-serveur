import { Router } from "express";
import { useRest } from "../../useRest";
import { getEpreuves } from "./getEpreuves";
import { getEpreuve } from "./getEpreuve";
import { patchEpreuve } from "./patchEpreuve";

const epreuvesRouter = Router();

// GET /sessions/:session/epreuves/
epreuvesRouter.get("/", (req, res) => useRest(getEpreuves, req, res));
// GET /sessions/:session/epreuves/:code/
epreuvesRouter.get("/:code", (req, res) => useRest(getEpreuve, req, res));
// PATCH /sessions/:session/epreuves/:code/update/
epreuvesRouter.patch("/:code/update", (req, res) => useRest(patchEpreuve, req, res));

export { epreuvesRouter };