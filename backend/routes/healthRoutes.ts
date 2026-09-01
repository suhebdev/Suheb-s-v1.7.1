import { Router, Request, Response } from "express";

const router = Router();

router.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "suhebdev-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
