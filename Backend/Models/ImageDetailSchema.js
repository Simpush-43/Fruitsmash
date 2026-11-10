const mongoose = require("mongoose");

const ImagedetailSchema = new mongoose.Schema({
  SenderID: {
    // 🟢 add this
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  ReceiverID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  CreatedAt: {
    type: Date,
    default: Date.now,
  },
  expireAt: {
    type: Date,
    required: true,
  },
});

// TTL index
ImagedetailSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Image", ImagedetailSchema);
