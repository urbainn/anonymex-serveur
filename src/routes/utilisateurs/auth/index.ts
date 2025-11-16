import { Router } from "express";
import { postLogin } from "./postLogin";
import { useRest } from "../../useRest";
import { getInfo } from "./getInfo";

const authRouteur = Router();

// POST /utilisateurs/auth/login
authRouteur.post("/login", (req, res) => useRest(postLogin, req, res));
// GET /utilisateurs/auth/info
authRouteur.get("/info", (req, res) => useRest(getInfo, req, res));

export { authRouteur as authRouteur };