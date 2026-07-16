export interface User {
  _id: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  sellerTier?: "basic" | "verified" | "premium";
  mfaEnabled: boolean;
  bio?: string;
  createdAt?: string;
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  price: number;
  condition: "new" | "like_new" | "good" | "fair";
  category: string;
  images: string[];
  seller: { _id: string; email: string; name?: string };
  status?: "active" | "sold" | "inactive";
  createdAt: string;
}

export interface CartItem {
  _id: string;
  listing: Listing;
  quantity: number;
}

export interface Order {
  _id: string;
  listing: { _id: string; title: string; price: number };
  buyer: { _id: string; email: string };
  seller: { _id: string; email: string };
  status: "pending_payment" | "payment_received" | "shipped" | "delivered" | "disputed" | "released" | "refunded";
  total: number;
  escrowReleaseDate?: string;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  user: string;
  action: string;
  outcome: "success" | "failure";
  ip?: string;
  createdAt: string;
}

export interface VerificationRequest {
  _id: string;
  user: { _id: string; email: string };
  documentType: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  mfaRequired: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  register: (email: string, password: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  fetchUser: () => Promise<void>;
}
