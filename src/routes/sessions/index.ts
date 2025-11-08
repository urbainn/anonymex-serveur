import { Router } from "express";
import { getSessions } from "./getSessions";
import { useRest } from "../useRest";
import { epreuvesRouter } from "./epreuves";

const sessionsRouter = Router();

// Epreuves
sessionsRouter.use("/:session/epreuves", epreuvesRouter);

// GET /sessions/
sessionsRouter.get("/", (req, res) => useRest(getSessions, req, res));

export { sessionsRouter as sessionsRouter };