import { app } from ".";
import { Request, Response } from "express";

export default function handler(req: Request, res: Response) {
  app(req, res);
}
