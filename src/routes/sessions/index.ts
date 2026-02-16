import { Router } from "express";
import { getSessions } from "./getSessions";
import { useRest } from "../useRest";
import { epreuvesRouter } from "./epreuves";
import { incidentsRouter } from "./incidents"
import { deleteSession } from "./deleteSession";
import { patchSession } from "./patchSession";
import { postSession } from "./postSession";
import { postImporterFichierSession } from "./postImporterFichierSession";

const sessionsRouter = Router();

// Epreuves
sessionsRouter.use("/:session/epreuves", epreuvesRouter);

// Incidents
sessionsRouter.use("/:session/incidents", incidentsRouter);

// GET /sessions/
sessionsRouter.get("/", (req, res) => useRest(getSessions, req, res));
// POST /sessions/
sessionsRouter.post("/", (req, res) => useRest(postSession, req, res));
// POST /sessions/importer/:id
sessionsRouter.post("/:id/importer/", (req, res) => useRest(postImporterFichierSession, req, res));
// DELETE /sessions/:id/
sessionsRouter.delete("/:id", (req, res) => useRest(deleteSession, req, res));
// PATCH /sessions/:id/
sessionsRouter.patch("/:id", (req, res) => useRest(patchSession, req, res));

export { sessionsRouter as sessionsRouter };