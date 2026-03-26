import { Router } from "express";
import { useRest } from "../useRest";
import { patchEtudiant } from "./patchEtudiant";
import { postEtudiant } from "./postEtudiant";

const etudiantsRouter = Router();

// POST /etudiants/
etudiantsRouter.patch("/", (req, res) =>
    useRest(() => postEtudiant(req.body), req, res));

// PATCH /etudiants/:numero/
etudiantsRouter.patch("/:numero", (req, res) =>
    useRest(() => patchEtudiant(req.params.numero, req.body), req, res));

export { etudiantsRouter as etudiantsRouter };