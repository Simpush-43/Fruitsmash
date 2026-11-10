const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { cloudinary, config: cloudinaryConfig } = require("../Config/Cloudinary");
const Image = require("../Models/ImageDetailSchema");
const dotenv = require("dotenv");
const path = require("path");
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const cloudinaryEnvironmentNames = [
  ["CLOUDINARY_CLOUD_NAME", cloudinaryConfig.cloud_name],
  ["CLOUDINARY_API_KEY", cloudinaryConfig.api_key],
  ["CLOUDINARY_API_SECRET", cloudinaryConfig.api_secret],
];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

cloudinary.config({
  ...cloudinaryConfig,
});

const storage = new CloudinaryStorage({
  cloudinary,
  // differnt parameters
  params: {
    folder: "uploads",
    allowed_formats: ["jpg", "png", "jpeg"],
    timeout: 120000,
  },
});
const upload = multer({
  storage,
  limits: { fileSize: MAX_IMAGE_SIZE },
}).single("image");
// save the uploads
const ImageUpload = (req, res) => {
  const missingConfig = cloudinaryEnvironmentNames
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missingConfig.length > 0) {
    return res.status(503).json({
      success: false,
      message: `Cloudinary is not configured. Set ${missingConfig.join(", ")} in Backend/.env.`,
    });
  }

  upload(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "Image is too large. Choose an image smaller than 10 MB.",
        });
      }
      if (err.http_code === 401 && /Invalid Signature/i.test(err.message || "")) {
        console.error("Cloudinary rejected the upload signature. Check that the cloud name, API key, and API secret are from the same Cloudinary account.");
        return res.status(502).json({
          success: false,
          message: "Cloudinary credentials do not match. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Backend/.env.",
        });
      }
      if (err.http_code === 499 || err.name === "TimeoutError") {
        console.error("Cloudinary image upload timed out. Check file size and network connectivity.");
        return res.status(504).json({
          success: false,
          message: "Image upload timed out. Try a smaller image or retry with a stable internet connection.",
        });
      }
      console.error("multer/cloudinary error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    try {
      const SenderID = req.user.id || req.user._id;
      const { ReceiverID } = req.body;
      const imageUrl = req.file.path;
      const expireAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min baad
      // save the image
      const newImage = await Image.create({
        SenderID: SenderID,
        imageUrl,
        expireAt,
        ReceiverID: ReceiverID,
      });
      res.status(200).json({ success: true, imageUrl: newImage.imageUrl });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ success: false, message: "Upload failed" });
    }
  });
};
const getAllimages = async (req, res) => {
  try {
    const { ReceiverID } = req.query;
    const images = await Image.find({ ReceiverID });
    res.status(200).json({ images });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch images", error: error.message });
    console.log(error.message);
  }
};
// get all images send to user
const ReceiveImages = async (req, res) => {
  try {
    const { SenderID, ReceiverID } = req.query;
    const images = await Image.find({
      SenderID: SenderID,
      ReceiverID: ReceiverID,
    })
      .populate("SenderID", "Firstname")
      .sort({ CreatedAt: -1 });
    res.status(200).json({ images });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to recieve images", error: error.message });
    console.log(error.message);
  }
};
module.exports = { ImageUpload, getAllimages, ReceiveImages };
