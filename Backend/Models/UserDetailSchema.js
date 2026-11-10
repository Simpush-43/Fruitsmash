const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const UserdetailSchema = new mongoose.Schema(
  {
    Firstname: {
      type: String,
      required: true,
    },
    Lastname: {
      type: String,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    Password: {
      type: String,
      required: true,
    },
    Age: {
      type: Number,
      required: true,
      min: 13,
    },
    Profilepic: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeenAt: {
      type: Date,
    },
    typingTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    typingUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);
// middleware to hash password before saving
UserdetailSchema.pre("save", async function (next) {
  if (!this.isModified("Password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12); // Generate a salt
    this.Password = await bcrypt.hash(this.Password, salt);
    next();
  } catch (error) {
    return next(error); // Pass errors to the next middleware
  }
});

// virtual keyword to not save full name in db saving memory
UserdetailSchema.virtual("fullname").get(() => {
  return `${this.Firstname} ${this.Lastname}`;
});

// enable virtuals in json output

UserdetailSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("User", UserdetailSchema);
