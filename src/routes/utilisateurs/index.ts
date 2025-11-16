import { Router } from "express";
import { useRest } from "../useRest";
import { getUtilisateurs } from "./getUtilisateurs";
import { patchUtilisateur } from "./patchUtilisateur";
import { deleteUtilisateur } from "./deleteUtilisateur";
import { authRouteur } from "./auth/";

const utilisateursRouter = Router();

utilisateursRouter.use("/auth", authRouteur);

// GET /utilisateurs/
utilisateursRouter.get("/", (req, res) => useRest(getUtilisateurs, req, res));
// PATCH /utilisateurs/:id/
utilisateursRouter.patch("/:id", (req, res) => useRest(patchUtilisateur, req, res));
// DELETE /utilisateurs/:id/
utilisateursRouter.delete("/", (req, res) => useRest(deleteUtilisateur, req, res));

export { utilisateursRouter as utilisateursRouter };