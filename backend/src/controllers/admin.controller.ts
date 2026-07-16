import { Request, Response, NextFunction } from "express";
import { UserModel } from "../models/user.model";
import { changeUserRole, changeUserTier, SelfTargetError } from "../services/admin.service";
import { RoleChangeDto, TierChangeDto } from "../validators/admin.schema";

export class AdminController {
  list = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await UserModel.find({}).select("-passwordHash -passwordHistory -mfaSecret -recoveryCodes").lean();
      return res.status(200).json(users);
    } catch (err) {
      next(err);
    }
  };

  // :id is re-resolved server-side by the service (findById), never trusted
  // as proof of anything on its own.
  changeRole = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await changeUserRole(req.user!._id, req.params.id, (req.validatedBody as RoleChangeDto).role);
      if (!subject) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(200).json({ id: subject._id, role: subject.role });
    } catch (err) {
      if (err instanceof SelfTargetError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  };

  changeTier = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const subject = await changeUserTier(req.user!._id, req.params.id, (req.validatedBody as TierChangeDto).sellerTier);
      if (!subject) {
        return res.status(404).json({ error: "Not found" });
      }
      return res.status(200).json({ id: subject._id, sellerTier: subject.sellerTier });
    } catch (err) {
      if (err instanceof SelfTargetError) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  };
}
