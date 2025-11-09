import { Router } from "express";
import { sessionsRouter } from "./sessions";
import { utilisateursRouter } from "./utilisateurs";

const router = Router();

router.use("/sessions", sessionsRouter);
router.use("/utilisateurs", utilisateursRouter);

export { router as indexRouter };