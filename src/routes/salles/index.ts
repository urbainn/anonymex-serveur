import { Router } from "express";
import { useRest } from "../useRest";
import { getSalle } from "./getSalle";
import { postSalle } from "./postSalle";
import { deleteSalle } from "./deleteSalle";


const sallesRouteur = Router();

// GET /salles/:code/
sallesRouteur.get("/:code", (req, res) => useRest(() => getSalle(req.params.code), req, res));

// DELETE /salles/:code/
sallesRouteur.delete("/:code", (req, res) => useRest(() => deleteSalle(req.params.code), req, res));

// POST /salles/
sallesRouteur.post("/", (req, res) => useRest(() => postSalle(req.body), req, res));

export { sallesRouteur as sallesRouteur };