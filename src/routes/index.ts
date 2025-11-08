import { Router } from "express";
import { sessionsRouter } from "./sessions";

const router = Router();

router.use("/sessions", sessionsRouter);

export { router as indexRouter };