import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a product name"],
      trim: true,
      maxlength: [200, "Name cannot be more than 200 characters"],
      index: true,
    },
    description: {
      type: String,
      maxlength: [1000, "Description cannot be more than 1000 characters"],
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, "Brand cannot be more than 100 characters"],
    },
    manufacturer: {
      type: String,
      trim: true,
      maxlength: [100, "Manufacturer cannot be more than 100 characters"],
    },
    slug: {
      type: String,
      index: true,
    },
    sku: {
      type: String,
      required: [true, "Please add a SKU"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    barcode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Please add a category"],
    },
    mart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      required: true,
    },
    pricing: {
      cost: {
        type: Number,
        required: [true, "Please add cost price"],
        min: [0, "Cost cannot be negative"],
      },
      price: {
        type: Number,
        required: [true, "Please add selling price"],
        min: [0, "Price cannot be negative"],
      },
      comparePrice: {
        type: Number,
        min: [0, "Compare price cannot be negative"],
      },
      profit: {
        type: Number,
        default: 0,
      },
      profitMargin: {
        type: Number,
        default: 0,
      },
    },
    inventory: {
      unit: {
        type: String,
        trim: true,
        default: "pcs",
      },
      quantity: {
        type: Number,
        required: [true, "Please add quantity"],
        min: [0, "Quantity cannot be negative"],
        default: 0,
      },
      minStock: {
        type: Number,
        default: 5,
        min: [0, "Minimum stock cannot be negative"],
      },
      maxStock: {
        type: Number,
        default: 1000,
        min: [0, "Maximum stock cannot be negative"],
      },
      reorderLevel: {
        type: Number,
        default: 10,
        min: [0, "Reorder level cannot be negative"],
      },
      reserved: {
        type: Number,
        default: 0,
        min: [0, "Reserved quantity cannot be negative"],
      },
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          type: String,
          default: "",
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    specifications: [
      {
        name: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
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
    variants: [
      {
        name: {
          type: String,
          required: true,
        },
        value: {
          type: String,
          required: true,
        },
        sku: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          default: 0,
        },
      },
    ],
    seo: {
      metaTitle: {
        type: String,
        maxlength: [60, "Meta title cannot be more than 60 characters"],
      },
      metaDescription: {
        type: String,
        maxlength: [160, "Meta description cannot be more than 160 characters"],
      },
      keywords: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
    },
    supplier: {
      name: {
        type: String,
        trim: true,
      },
      contact: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number,
      unit: {
        type: String,
        enum: ["cm", "inch", "kg", "lb"],
        default: "cm",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isDigital: {
      type: Boolean,
      default: false,
    },
    requiresShipping: {
      type: Boolean,
      default: true,
    },
    trackInventory: {
      type: Boolean,
      default: true,
    },
    allowBackorder: {
      type: Boolean,
      default: false,
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

// Create slug from name
productSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  }

  // Calculate profit and profit margin
  if (this.isModified("pricing.cost") || this.isModified("pricing.price")) {
    this.pricing.profit = this.pricing.price - this.pricing.cost;
    this.pricing.profitMargin =
      this.pricing.cost > 0
        ? (this.pricing.profit / this.pricing.cost) * 100
        : 0;
  }

  next();
});

// Virtual for availability status
productSchema.virtual("availabilityStatus").get(function () {
  if (this.inventory.quantity <= 0) return "out_of_stock";
  if (this.inventory.quantity <= this.inventory.minStock) return "low_stock";
  return "in_stock";
});

// Virtual for available quantity (total - reserved)
productSchema.virtual("availableQuantity").get(function () {
  return Math.max(0, this.inventory.quantity - this.inventory.reserved);
});

// Virtual for primary image
productSchema.virtual("primaryImage").get(function () {
  const primary = this.images.find((img) => img.isPrimary);
  return primary || this.images[0] || null;
});

// Indexes
productSchema.index({ mart: 1, name: 1 });
productSchema.index({ mart: 1, category: 1 });
productSchema.index({ mart: 1, isActive: 1 });
productSchema.index({ mart: 1, isFeatured: 1 });
productSchema.index({ "inventory.quantity": 1 });
productSchema.index({ "pricing.price": 1 });
productSchema.index({ tags: 1 });
productSchema.index({ createdAt: -1 });

productSchema.plugin(mongoosePaginate);

export default mongoose.model("Product", productSchema);
