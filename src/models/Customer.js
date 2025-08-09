import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
  {
    customerNumber: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Please add customer name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please add a valid email",
      ],
      index: true,
    },
    phone: {
      type: String,
      required: [true, "Please add phone number"],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please add a valid phone number"],
      index: true,
    },
    alternatePhone: {
      type: String,
      trim: true,
      match: [
        /^\+?[\d\s\-\(\)]+$/,
        "Please add a valid alternate phone number",
      ],
    },
    address: {
      street: {
        type: String,
        trim: true,
      },
      city: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      zipCode: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        trim: true,
        default: "USA",
      },
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
      default: "prefer_not_to_say",
    },
    mart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      required: true,
    },
    loyalty: {
      points: {
        type: Number,
        default: 0,
        min: [0, "Loyalty points cannot be negative"],
      },
      tier: {
        type: String,
        enum: ["bronze", "silver", "gold", "platinum"],
        default: "bronze",
      },
      joinDate: {
        type: Date,
        default: Date.now,
      },
    },
    purchase: {
      totalOrders: {
        type: Number,
        default: 0,
        min: [0, "Total orders cannot be negative"],
      },
      totalSpent: {
        type: Number,
        default: 0,
        min: [0, "Total spent cannot be negative"],
      },
      averageOrderValue: {
        type: Number,
        default: 0,
        min: [0, "Average order value cannot be negative"],
      },
      lastPurchaseDate: {
        type: Date,
      },
      firstPurchaseDate: {
        type: Date,
      },
    },
    preferences: {
      communicationMethod: {
        type: String,
        enum: ["email", "sms", "both", "none"],
        default: "email",
      },
      categories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
      ],
      brands: [
        {
          type: String,
          trim: true,
        },
      ],
    },
    notes: [
      {
        note: {
          type: String,
          required: true,
          maxlength: [500, "Note cannot be more than 500 characters"],
        },
        addedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        isPrivate: {
          type: Boolean,
          default: false,
        },
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    creditLimit: {
      type: Number,
      default: 0,
      min: [0, "Credit limit cannot be negative"],
    },
    currentCredit: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isBlacklisted: {
      type: Boolean,
      default: false,
    },
    blacklistReason: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: [
        "walk_in",
        "online",
        "referral",
        "marketing",
        "social_media",
        "other",
      ],
      default: "walk_in",
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate customer number
customerSchema.pre("save", function (next) {
  if (this.isNew && !this.customerNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    this.customerNumber = `CUST-${timestamp}-${random}`;
  }

  // Update loyalty tier based on total spent
  if (this.isModified("purchase.totalSpent")) {
    const totalSpent = this.purchase.totalSpent;
    if (totalSpent >= 10000) {
      this.loyalty.tier = "platinum";
    } else if (totalSpent >= 5000) {
      this.loyalty.tier = "gold";
    } else if (totalSpent >= 1000) {
      this.loyalty.tier = "silver";
    } else {
      this.loyalty.tier = "bronze";
    }
  }

  next();
});

// Virtual for full name
customerSchema.virtual("fullAddress").get(function () {
  if (!this.address.street) return "";
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`
    .replace(/,\s*,/g, ",")
    .trim();
});

// Virtual for age
customerSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Virtual for available credit
customerSchema.virtual("availableCredit").get(function () {
  return Math.max(0, this.creditLimit - this.currentCredit);
});

// Indexes
customerSchema.index({ mart: 1, phone: 1 }, { unique: true });
customerSchema.index({ mart: 1, email: 1 }, { unique: true, sparse: true });
customerSchema.index({ mart: 1, isActive: 1 });
customerSchema.index({ mart: 1, "loyalty.tier": 1 });
customerSchema.index({ mart: 1, "purchase.totalSpent": -1 });
customerSchema.index({ mart: 1, "purchase.lastPurchaseDate": -1 });
customerSchema.index({ tags: 1 });
customerSchema.index({ createdAt: -1 });

export default mongoose.model("Customer", customerSchema);
