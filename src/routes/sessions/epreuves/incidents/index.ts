import { Router } from "express";
import { useRest } from "../../../useRest";
import { getIncident } from "./getIncident";
import { getIncidents } from "./getIncidents";
import { postIncident } from "./postIncident";

const incidentsRouter = Router({ mergeParams: true });

// GET /sessions/:session/epreuves/:code/incidents/:id
incidentsRouter.get<{ session: string, code: string, id: string }>("/:id", (req, res) =>
    useRest(() => getIncident(req.params.session, req.params.code, req.params.id), req, res));

// GET /sessions/:session/epreuves/:code/incidents/
incidentsRouter.get<{ session: string, code: string }>("/", (req, res) =>
    useRest(() => getIncidents(req.params.session, req.params.code), req, res));

// POST /sessions/:session/epreuves/:code/incidents/:id
incidentsRouter.post<{ session: string, code: string, id: string }>("/:id", (req, res) =>
    useRest(() => postIncident(req.params.session, req.params.code, req.params.id, req.body.codeAnonymat, req.body.noteQuart), req, res));

export { incidentsRouter };