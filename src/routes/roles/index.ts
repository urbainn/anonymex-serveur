import { Router } from "express";
import { useRest } from "../useRest";
import { getRole } from "./getRole";
import { getRoles } from "./getRoles";
import { deleteRole } from "./deleteRole";
import { postRole } from "./postRole";


const rolesRouteur = Router();

// GET /roles/:id/
rolesRouteur.get("/:id", (req, res) => useRest(getRole, req, res));
// GET /roles/list/
rolesRouteur.get("/:id", (req, res) => useRest(getRoles, req, res));
// DELETE /roles/:id/
rolesRouteur.get("/:id", (req, res) => useRest(deleteRole, req, res));
// POST /roles/new/
rolesRouteur.post("/new", (req, res) => useRest(postRole, req, res));

export { rolesRouteur as rolesRouteur };