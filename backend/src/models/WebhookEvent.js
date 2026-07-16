import mongoose from "mongoose";

const { Schema } = mongoose;

const webhookEventSchema = new Schema({
  eventId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  orderId: { type: Schema.Types.ObjectId, ref: "Order" },
  processedAt: { type: Date, default: Date.now },
});

export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);
