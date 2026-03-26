import { Router } from "express";
import { getSessions } from "./getSessions";
import { useRest } from "../useRest";
import { epreuvesRouter } from "./epreuves";
import { deleteSession } from "./deleteSession";
import { patchSession } from "./patchSession";
import { postSession } from "./postSession";
import { postImporterFichierSession } from "./postImporterFichierSession";

const sessionsRouter = Router();

// Epreuves
sessionsRouter.use("/:session/epreuves", epreuvesRouter);

// GET /sessions/
sessionsRouter.get("/", (req, res) =>
    useRest(getSessions, req, res));

// POST /sessions/
sessionsRouter.post("/", (req, res) =>
    useRest(() => postSession(req.body), req, res));

// POST /sessions/importer/:id
sessionsRouter.post("/:id/importer/", (req, res) =>
    useRest(() => postImporterFichierSession(req.params.id, req.body.fichiers), req, res));

// DELETE /sessions/:id/
sessionsRouter.delete("/:id", (req, res) =>
    useRest(() => deleteSession(req.params.id), req, res));

// PATCH /sessions/:id/
sessionsRouter.patch("/:id", (req, res) =>
    useRest(() => patchSession(req.params.id, req.body), req, res));

export { sessionsRouter as sessionsRouter };