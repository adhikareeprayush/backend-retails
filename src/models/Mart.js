import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const martSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a mart name"],
      trim: true,
      maxlength: [100, "Name cannot be more than 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot be more than 500 characters"],
    },
    slug: {
      type: String,
      unique: true,
      index: true,
    },
    address: {
      street: {
        type: String,
        required: [true, "Please add a street address"],
      },
      city: {
        type: String,
        required: [true, "Please add a city"],
      },
      state: {
        type: String,
        required: [true, "Please add a state"],
      },
      zipCode: {
        type: String,
        required: [true, "Please add a zip code"],
      },
      country: {
        type: String,
        required: [true, "Please add a country"],
        default: "USA",
      },
    },
    contact: {
      phone: {
        type: String,
        match: [/^\+?[\d\s\-\(\)]+$/, "Please add a valid phone number"],
      },
      email: {
        type: String,
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please add a valid email",
        ],
      },
      website: {
        type: String,
        match: [
          /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&=]*)$/,
          "Please add a valid website URL",
        ],
      },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    staff: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["manager", "cashier", "inventory_manager", "staff"],
          default: "staff",
        },
        permissions: [
          {
            type: String,
            enum: [
              "read",
              "write",
              "delete",
              "manage_inventory",
              "manage_staff",
              "view_reports",
            ],
          },
        ],
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    settings: {
      currency: {
        type: String,
        default: "USD",
      },
      taxRate: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      timezone: {
        type: String,
        default: "UTC",
      },
      businessHours: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String },
      },
      loyaltyProgram: {
        enabled: {
          type: Boolean,
          default: false,
        },
        pointsPerDollar: {
          type: Number,
          default: 1,
        },
        pointsValue: {
          type: Number,
          default: 0.01,
        },
      },
    },
    subscription: {
      plan: {
        type: String,
        enum: ["basic", "premium", "enterprise"],
        default: "basic",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
        default: "active",
      },
      expiresAt: {
        type: Date,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create slug from name
martSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }
  next();
});

// Virtual for full address
martSchema.virtual("fullAddress").get(function () {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}, ${this.address.country}`;
});

// Indexes
martSchema.index({ owner: 1 });
martSchema.index({ "address.city": 1 });
martSchema.index({ isActive: 1 });
martSchema.index({ createdAt: -1 });

martSchema.plugin(mongoosePaginate);

export default mongoose.model("Mart", martSchema);
