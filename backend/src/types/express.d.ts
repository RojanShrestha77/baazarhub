import { IUser } from "../models/user.model";
import { ISession } from "../models/session.model";

// Request augmentation for the fields our middleware attaches. Kept in one
// place so every handler sees the same typed surface.
declare global {
  namespace Express {
    interface Request {
      user?: IUser | null;
      session?: ISession | null;
      validatedBody?: unknown;
      validatedQuery?: unknown;
      // Idempotency guard for loadSession — safe to call more than once.
      __sessionLoaded?: boolean;
    }
  }
}

export {};
