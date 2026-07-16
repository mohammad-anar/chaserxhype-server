import { NextFunction, Request, Response } from "express";
import { ZodObject } from "zod";

import { unlinkFiles } from "../shared/unlinkFile.js";

const validateRequest =
  (schema: ZodObject<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let parsedBody: any = {};

      if (req.body) {
        if (typeof req.body === "string") {
          parsedBody = JSON.parse(req.body);
        } else if (req.body.data && typeof req.body.data === "string") {
          parsedBody = JSON.parse(req.body.data);
        } else {
          parsedBody = req.body;
        }
      }
      await schema.parseAsync(parsedBody);

      req.body = parsedBody;
      next();
    } catch (error) {
      // Clean up any uploaded files if validation fails
      unlinkFiles(req.files);
      console.log(error);
      next(error);
    }
  };

export default validateRequest;
