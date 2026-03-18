import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "./error-handler.js";

export function requireInternalToken(req: Request, _res: Response, next: NextFunction) {
  const token = req.header("x-internal-token");
  if (!token || token !== env.INTERNAL_WEBHOOK_TOKEN) {
    next(new HttpError(401, "Unauthorized"));
    return;
  }
  next();
}
