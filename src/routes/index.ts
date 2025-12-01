import { Router } from "express";
import { sessionsRouter } from "./sessions";
import { utilisateursRouter } from "./utilisateurs";
import { rolesRouteur } from "./roles";

const router = Router();

router.use("/sessions", sessionsRouter);
router.use("/utilisateurs", utilisateursRouter);
router.use("/roles", rolesRouteur)

export { router as indexRouter };