import { Router } from "express";
import { getSessions } from "./getSessions";
import { useRest } from "../useRest";
import { epreuvesRouter } from "./epreuves";
import { incidentsRouter } from "./incidents"
import { deleteSession } from "./deleteSession";
import { patchSession } from "./patchSession";
import { postSession } from "./postSession";

const sessionsRouter = Router();

// Epreuves
sessionsRouter.use("/:session/epreuves", epreuvesRouter);

// Incidents
sessionsRouter.use("/:session/incidents", incidentsRouter);

// GET /sessions/list/
sessionsRouter.get("/list", (req, res) => useRest(getSessions, req, res));
// POST /sessions/new/
sessionsRouter.post("/new", (req, res) => useRest(postSession, req, res));
// DELETE /sessions/:id/
sessionsRouter.delete("/:id", (req, res) => useRest(deleteSession, req, res));
// PATCH /sessions/:id/update/
sessionsRouter.patch("/:id/update", (req, res) => useRest(patchSession, req, res));

export { sessionsRouter as sessionsRouter };