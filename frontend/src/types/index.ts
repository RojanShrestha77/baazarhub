export interface UserProfile {
  id: string;
  displayName: string;
  bio: string;
  location: string;
  hasAvatar: boolean;
  email: string;
  role: "buyer" | "seller" | "admin";
  sellerTier: "unverified" | "verified" | "trusted";
  sellerApplicationStatus: "none" | "pending" | "approved" | "rejected";
  mfaEnabled: boolean;
  emailVerified?: boolean;
}

// Public profile (someone else's) — sellers additionally carry a rating badge.
export interface PublicProfile {
  id: string;
  displayName: string;
  bio: string;
  location: string;
  hasAvatar: boolean;
  sellerRating?: RatingSummary;
}

export interface RatingSummary {
  average: number;
  count: number;
}

export interface Review {
  id: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewsResponse {
  summary: RatingSummary;
  reviews: Review[];
}

export interface Address {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  district: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  lastMessageAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  body: string;
  reported: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface SerializedListing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceMinorUnits: number;
  currency: string;
  category: string;
  status: "draft" | "active" | "sold" | "withdrawn";
  quantity: number;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  listings: SerializedListing[];
  total: number;
  page: number;
  limit: number;
}

export interface ResolvedCartItem {
  listingId: string;
  title?: string;
  quantity: number;
  unitPriceMinorUnits?: number;
  lineTotalMinorUnits?: number;
  available: boolean;
  reason?: string;
}

export interface Cart {
  items: ResolvedCartItem[];
  totalMinorUnits: number;
}

export type OrderStatus = "created" | "payment_held" | "shipped" | "delivered" | "released" | "disputed" | "refunded" | "cancelled";

export interface Order {
  _id: string;
  buyerId: string;
  sellerId: string;
  listingId: string;
  listingSnapshot: {
    title: string;
    priceMinorUnits: number;
    currency: string;
  };
  quantity: number;
  totalMinorUnits: number;
  status: OrderStatus;
  stripePaymentIntentId?: string;
  holdDurationMs: number;
  deliveredAt?: string;
  disputedAt?: string;
  releasedAt?: string;
  refundedAt?: string;
  disputeResolvedBy?: string;
  disputeResolution?: "released" | "refunded";
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutResult {
  orderId: string;
  clientSecret: string;
  totalMinorUnits: number;
}

export interface VerificationStatus {
  id?: string;
  status: "pending" | "approved" | "rejected" | null;
  documents?: number;
  rejectionReason?: string;
  createdAt?: string;
  reviewedAt?: string;
  message?: string;
}

export interface AdminUserAction {
  id: string;
  role?: "buyer" | "seller" | "admin";
  sellerTier?: "unverified" | "verified" | "trusted";
}

export interface AuditLog {
  _id: string;
  actor?: string;
  action: string;
  outcome: "success" | "failure";
  subject?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ExportData {
  user: {
    email: string;
    role: string;
    sellerTier: string;
    mfaEnabled: boolean;
    createdAt: string;
  };
  profile: {
    displayName: string;
    bio: string;
    location: string;
    hasAvatar: boolean;
  };
}

export function formatPrice(minorUnits: number): string {
  return (minorUnits / 100).toLocaleString("en-IN", { style: "currency", currency: "NPR" });
}
