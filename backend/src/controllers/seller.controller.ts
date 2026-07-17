import { Request, Response, NextFunction } from "express";
import { applyForSeller, SellerApplicationError } from "../services/seller.service";

export class SellerController {
  apply = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await applyForSeller(req.user!._id);
      return res.status(200).json({ sellerApplicationStatus: user.sellerApplicationStatus });
    } catch (err) {
      if (err instanceof SellerApplicationError) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      next(err);
    }
  };
}
