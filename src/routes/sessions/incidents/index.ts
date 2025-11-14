import { Router } from "express";
import { useRest } from "../../useRest";
import { getIncident } from "./getIncident";
import { getIncidents } from "./getIncidents";

const incidentsRouter = Router();


// GET /sessions/:session/incidents/
incidentsRouter.get("/", (req, res) => useRest(getIncidents, req, res));
// GET /sessions/:session/incidents/:id/
incidentsRouter.get("/:id", (req, res) => useRest(getIncident, req, res));

export { incidentsRouter };