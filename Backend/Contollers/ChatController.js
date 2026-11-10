const mongoose = require("mongoose");
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, config: cloudinaryConfig } = require("../Config/Cloudinary");
const ChatMessage = require("../Models/ChatMessageSchema");
const Image = require("../Models/ImageDetailSchema");
const User = require("../Models/UserDetailSchema");

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_PAGE_SIZE = 50;
const ONLINE_WINDOW_MS = 45_000;

const attachmentStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "photosafe-chat",
    resource_type: file.mimetype.startsWith("audio/") ? "video" : "auto",
    timeout: 120_000,
  }),
});

const attachmentUpload = multer({
  storage: attachmentStorage,
  limits: { fileSize: MAX_ATTACHMENT_SIZE },
  fileFilter: (req, file, callback) => {
    const supportedType =
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype.startsWith("audio/") ||
      file.mimetype === "application/pdf";
    if (!supportedType) {
      return callback(new Error("Unsupported attachment. Choose an image, video, audio recording, or PDF."));
    }
    return callback(null, true);
  },
}).single("file");

const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const createMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { recipientId, type, text, gifId, stickerId, sticker } = req.body;
    const supportedTypes = ["text", "gif", "sticker"];

    if (!isValidId(recipientId) || String(recipientId) === String(senderId)) {
      return res.status(400).json({ message: "Choose a valid recipient." });
    }
    if (!(await User.exists({ _id: recipientId }))) {
      return res.status(404).json({ message: "Recipient not found." });
    }
    if (!supportedTypes.includes(type)) {
      return res.status(400).json({ message: "Unsupported message type." });
    }

    const message = {
      SenderID: senderId,
      ReceiverID: recipientId,
      type,
    };
    if (type === "text") {
      const cleanText = String(text || "").trim();
      if (!cleanText || cleanText.length > 4000) {
        return res.status(400).json({ message: "Messages must contain 1 to 4000 characters." });
      }
      message.text = cleanText;
    } else if (type === "gif") {
      const cleanGifId = String(gifId || "");
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(cleanGifId)) {
        return res.status(400).json({ message: "Choose a valid GIPHY GIF." });
      }
      message.gifId = cleanGifId;
      message.text = String(text || "").trim().slice(0, 4000);
    } else {
      const cleanStickerId = String(stickerId || "");
      if (cleanStickerId && /^[A-Za-z0-9_-]{1,64}$/.test(cleanStickerId)) {
        message.stickerId = cleanStickerId;
        message.text = String(text || "").trim().slice(0, 4000);
      } else {
        const stickerValue = String(sticker || "");
        if (!stickerValue || stickerValue.length > 16) {
          return res.status(400).json({ message: "Choose a valid sticker." });
        }
        message.sticker = stickerValue;
      }
    }

    const savedMessage = await ChatMessage.create(message);
    return res.status(201).json({ message: savedMessage });
  } catch (error) {
    console.error("Could not create chat message:", error);
    return res.status(500).json({ message: "Message could not be sent." });
  }
};

const uploadAttachment = (req, res) => {
  const missingConfig = [
    ["CLOUDINARY_CLOUD_NAME", cloudinaryConfig.cloud_name],
    ["CLOUDINARY_API_KEY", cloudinaryConfig.api_key],
    ["CLOUDINARY_API_SECRET", cloudinaryConfig.api_secret],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missingConfig.length) {
    return res.status(503).json({
      message: `Cloudinary is not configured. Set ${missingConfig.join(", ")} in Backend/.env.`,
    });
  }

  attachmentUpload(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Attachments must be smaller than 10 MB." });
      }
      if (error.http_code === 401 && /Invalid Signature/i.test(error.message || "")) {
        return res.status(502).json({
          message: "Cloudinary credentials do not match. Check all three Cloudinary values in Backend/.env.",
        });
      }
      if (error.http_code === 499 || error.name === "TimeoutError") {
        return res.status(504).json({
          message: "Upload timed out. Try a smaller file or a more stable internet connection.",
        });
      }
      return res.status(400).json({ message: error.message || "Attachment upload failed." });
    }
    if (!req.file) {
      return res.status(400).json({ message: "Choose a file to upload." });
    }

    try {
      const { recipientId, duration } = req.body;
      if (!isValidId(recipientId) || String(recipientId) === String(req.user.id)) {
        return res.status(400).json({ message: "Choose a valid recipient." });
      }
      if (!(await User.exists({ _id: recipientId }))) {
        return res.status(404).json({ message: "Recipient not found." });
      }

      const mimeType = req.file.mimetype || "application/octet-stream";
      const type = mimeType.startsWith("image/")
        ? "image"
        : mimeType.startsWith("video/")
          ? "video"
          : mimeType.startsWith("audio/")
            ? "voice"
            : "file";

      if (type === "image") {
        await Image.create({
          SenderID: req.user.id,
          ReceiverID: recipientId,
          imageUrl: req.file.path,
          expireAt: new Date(Date.now() + 5 * 60 * 1000),
        });
      }

      const message = await ChatMessage.create({
        SenderID: req.user.id,
        ReceiverID: recipientId,
        type,
        mediaUrl: req.file.path,
        mediaName: req.file.originalname,
        mimeType,
        ...(type === "voice" && Number.isFinite(Number(duration))
          ? { duration: Math.max(0, Number(duration)) }
          : {}),
      });
      return res.status(201).json({ message });
    } catch (saveError) {
      console.error("Could not save uploaded chat attachment:", saveError);
      return res.status(500).json({ message: "Attachment uploaded but could not be added to the conversation." });
    }
  });
};

const listMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const contactId = req.params.contactId;
    if (!isValidId(contactId) || String(contactId) === String(currentUserId)) {
      return res.status(400).json({ message: "Choose a valid contact." });
    }
    if (!(await User.exists({ _id: contactId }))) {
      return res.status(404).json({ message: "Contact not found." });
    }

    const query = {
      $or: [
        { SenderID: currentUserId, ReceiverID: contactId },
        { SenderID: contactId, ReceiverID: currentUserId },
      ],
    };
    if (req.query.before) {
      const before = new Date(req.query.before);
      if (Number.isNaN(before.getTime())) {
        return res.status(400).json({ message: "Invalid message cursor." });
      }
      query.createdAt = { $lt: before };
    }

    if (!req.query.before) {
      await ChatMessage.updateMany(
        { SenderID: contactId, ReceiverID: currentUserId, readAt: { $exists: false } },
        { $set: { deliveredAt: new Date(), readAt: new Date() } }
      );
    }

    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(MAX_PAGE_SIZE)
      .lean();
    return res.status(200).json({ messages: messages.reverse(), hasMore: messages.length === MAX_PAGE_SIZE });
  } catch (error) {
    console.error("Could not load chat messages:", error);
    return res.status(500).json({ message: "Messages could not be loaded." });
  }
};

const listConversations = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const conversations = await ChatMessage.aggregate([
      { $match: { $or: [{ SenderID: userId }, { ReceiverID: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$SenderID", userId] }, "$ReceiverID", "$SenderID"],
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$ReceiverID", userId] }, { $eq: [{ $ifNull: ["$readAt", null] }, null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, contactId: "$_id", lastMessage: 1, unreadCount: 1 } },
    ]);
    return res.status(200).json({ conversations });
  } catch (error) {
    console.error("Could not load conversations:", error);
    return res.status(500).json({ message: "Conversations could not be loaded." });
  }
};

const postHeartbeat = async (req, res) => {
  const typingTo = req.body?.typingTo;
  if (typingTo && (!isValidId(typingTo) || String(typingTo) === String(req.user.id))) {
    return res.status(400).json({ message: "Invalid typing recipient." });
  }
  const now = new Date();
  await User.updateOne(
    { _id: req.user.id },
    {
      $set: {
        isOnline: true,
        lastSeenAt: now,
        typingTo: typingTo || null,
        typingUntil: typingTo ? new Date(now.getTime() + 4000) : null,
      },
    }
  );
  return res.status(204).end();
};

const markOffline = async (req, res) => {
  await User.updateOne(
    { _id: req.user.id },
    { $set: { isOnline: false, lastSeenAt: new Date(), typingTo: null, typingUntil: null } }
  );
  return res.status(204).end();
};

const getPresence = async (req, res) => {
  const ids = String(req.query.userIds || "")
    .split(",")
    .filter(isValidId)
    .slice(0, 100);
  if (!ids.length) return res.status(200).json({ presence: [] });

  const now = Date.now();
  const users = await User.find({ _id: { $in: ids } }).select("_id isOnline lastSeenAt typingTo typingUntil").lean();
  const presence = users.map((user) => {
    const lastSeenAt = user.lastSeenAt || null;
    const online = Boolean(user.isOnline && lastSeenAt && now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS);
    return {
      userId: String(user._id),
      online,
      lastSeenAt,
      typing: Boolean(
        online &&
        String(user.typingTo) === String(req.user.id) &&
        user.typingUntil &&
        new Date(user.typingUntil).getTime() > now
      ),
    };
  });
  return res.status(200).json({ presence });
};

module.exports = {
  createMessage,
  uploadAttachment,
  listMessages,
  listConversations,
  postHeartbeat,
  markOffline,
  getPresence,
};
