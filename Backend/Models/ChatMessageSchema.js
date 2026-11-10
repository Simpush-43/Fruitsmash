const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    SenderID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ReceiverID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["text", "image", "video", "file", "voice", "gif", "sticker"],
      required: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    mediaUrl: String,
    gifId: String,
    mediaName: String,
    mimeType: String,
    duration: Number,
    sticker: String,
    stickerId: String,
    deliveredAt: Date,
    readAt: Date,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ SenderID: 1, ReceiverID: 1, createdAt: -1 });
ChatMessageSchema.index({ ReceiverID: 1, SenderID: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);
