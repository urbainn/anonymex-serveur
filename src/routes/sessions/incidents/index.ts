import { Router } from "express";
import { useRest } from "../../useRest";
import { getIncident } from "./getIncident";
import { getIncidents } from "./getIncidents";
import { postIncident } from "./postIncident";

const incidentsRouter = Router({ mergeParams: true });

// GET /sessions/:session/incidents/:id/
incidentsRouter.get<{ session: string, id: string }>("/:id", (req, res) =>
    useRest(() => getIncident(req.params.session, req.params.id), req, res));

// GET /sessions/:session/incidents/
incidentsRouter.get<{ session: string }>("/", (req, res) =>
    useRest(() => getIncidents(req.params.session), req, res));

// POST /sessions/:session/:epreuve/incidents/:id/correction
incidentsRouter.get<{ session: string, epreuve: string, id: string, codeAnonymat: string, noteQuart: string}>("/:id", (req, res) =>
    useRest(() => postIncident(req.params.session, req.params.epreuve, req.params.id, req.params.codeAnonymat, req.params.noteQuart), req, res));

export { incidentsRouter };