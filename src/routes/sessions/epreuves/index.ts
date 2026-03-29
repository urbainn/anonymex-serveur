import { Router } from "express";
import { useRest } from "../../useRest";
import { getEpreuves } from "./getEpreuves";
import { getEpreuve } from "./getEpreuve";
import { patchEpreuve } from "./patchEpreuve";
import { depotRouter } from "./depot";
import { incidentsRouter } from "./incidents";
import { convocationsRouteur } from "./convocations";
import { getEpreuveSalles } from "./getEpreuveSalles";

const epreuvesRouter = Router({ mergeParams: true });

// Dépôts
epreuvesRouter.use("/:code/depot", depotRouter);

// Incidents
epreuvesRouter.use("/:code/incidents", incidentsRouter);

// Convocations
epreuvesRouter.use("/:code/convocations", convocationsRouteur);

// GET /sessions/:session/epreuves/:code/salles
epreuvesRouter.get<{ session: string, code: string }>
    ("/:code/salles", (req, res) => useRest(() => getEpreuveSalles(req.params.session, req.params.code), req, res));

// GET /sessions/:session/epreuves/:code/
epreuvesRouter.get<{ session: string, code: string }>
    ("/:code", (req, res) => useRest(() => getEpreuve(req.params.session, req.params.code), req, res));

// GET /sessions/:session/epreuves/
epreuvesRouter.get<{ session: string }>
    ("/", (req, res) => useRest(() => getEpreuves(req.params.session), req, res));

// PATCH /sessions/:session/epreuves/:code/
epreuvesRouter.patch<{ session: string, code: string }>
    ("/:code", (req, res) => useRest(() => patchEpreuve(req.params.session, req.params.code, req.body), req, res));

export { epreuvesRouter };