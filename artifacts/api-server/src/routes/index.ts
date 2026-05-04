import { Router, type IRouter } from "express";
import healthRouter from "./health";
import linktreeRouter from "./linktree";
import storageRouter from "./storage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(linktreeRouter);
router.use(storageRouter);

export default router;
