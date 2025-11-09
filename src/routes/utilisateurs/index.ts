import { Router } from "express";
import { useRest } from "../useRest";
import { getUtilisateurs } from "./getUtilisateurs";
import { postUtilisateur } from "./postUtilisateur";
import { patchUtilisateur } from "./patchUtilisateur";
import { deleteUtilisateur } from "./deleteUtilisateur";

const utilisateursRouter = Router();

// GET /utilisateurs/
utilisateursRouter.get("/", (req, res) => useRest(getUtilisateurs, req, res));
// POST /utilisateurs/login
utilisateursRouter.get("/login", (req, res) => useRest(postUtilisateur, req, res));
// PATCH /utilisateurs/:id/
utilisateursRouter.patch("/:id", (req, res) => useRest(patchUtilisateur, req, res));
// DELETE /utilisateurs/:id/
utilisateursRouter.get("/", (req, res) => useRest(deleteUtilisateur, req, res));

export { utilisateursRouter as utilisateursRouter };