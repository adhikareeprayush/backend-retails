import mongoose from "mongoose";
import mongoosePaginate from "mongoose-paginate-v2";

const billItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productCode: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    min: [0.01, "Quantity must be positive"],
  },
  unit: {
    type: String,
    required: true,
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: [true, "Unit price is required"],
    min: [0, "Unit price cannot be negative"],
  },
  costPrice: {
    type: Number,
    required: true,
    min: [0, "Cost price cannot be negative"],
  },
  discount: {
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "percentage",
    },
    value: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
  },
  tax: {
    rate: {
      type: Number,
      default: 0,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },
    amount: {
      type: Number,
      default: 0,
      min: [0, "Tax amount cannot be negative"],
    },
  },
  lineTotal: {
    type: Number,
    required: true,
    min: [0, "Line total cannot be negative"],
  },
  profit: {
    type: Number,
    default: 0,
  },
});

const billSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      unique: true,
      index: true,
    },
    mart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
    customerInfo: {
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
      },
    },
    type: {
      type: String,
      enum: ["sale", "return", "exchange"],
      default: "sale",
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "completed", "cancelled", "refunded"],
      default: "completed",
    },
    items: [billItemSchema],
    payment: {
      method: {
        type: String,
        enum: ["cash", "card", "upi", "netbanking", "credit", "multiple"],
        required: true,
      },
      methods: [
        {
          type: {
            type: String,
            enum: ["cash", "card", "upi", "netbanking", "credit"],
          },
          amount: {
            type: Number,
            min: [0, "Payment amount cannot be negative"],
          },
          reference: {
            type: String,
            trim: true,
          },
        },
      ],
      status: {
        type: String,
        enum: ["pending", "completed", "failed", "refunded"],
        default: "completed",
      },
      paidAmount: {
        type: Number,
        default: 0,
        min: [0, "Paid amount cannot be negative"],
      },
      dueAmount: {
        type: Number,
        default: 0,
      },
      dueDate: {
        type: Date,
      },
    },
    amounts: {
      subtotal: {
        type: Number,
        required: true,
        min: [0, "Subtotal cannot be negative"],
      },
      totalDiscount: {
        type: Number,
        default: 0,
        min: [0, "Total discount cannot be negative"],
      },
      totalTax: {
        type: Number,
        default: 0,
        min: [0, "Total tax cannot be negative"],
      },
      total: {
        type: Number,
        required: true,
        min: [0, "Total cannot be negative"],
      },
      roundOff: {
        type: Number,
        default: 0,
      },
      finalTotal: {
        type: Number,
        required: true,
        min: [0, "Final total cannot be negative"],
      },
      totalProfit: {
        type: Number,
        default: 0,
      },
      totalCost: {
        type: Number,
        default: 0,
        min: [0, "Total cost cannot be negative"],
      },
    },
    discounts: [
      {
        type: {
          type: String,
          enum: ["percentage", "fixed", "loyalty", "coupon"],
          required: true,
        },
        value: {
          type: Number,
          required: true,
          min: [0, "Discount value cannot be negative"],
        },
        amount: {
          type: Number,
          required: true,
          min: [0, "Discount amount cannot be negative"],
        },
        description: {
          type: String,
          trim: true,
        },
        appliedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
      },
    ],
    notes: {
      customer: {
        type: String,
        trim: true,
        maxlength: [500, "Customer notes cannot exceed 500 characters"],
      },
      internal: {
        type: String,
        trim: true,
        maxlength: [500, "Internal notes cannot exceed 500 characters"],
      },
    },
    originalBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    returnReason: {
      type: String,
      trim: true,
      maxlength: [200, "Return reason cannot exceed 200 characters"],
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
    printCount: {
      type: Number,
      default: 0,
      min: [0, "Print count cannot be negative"],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Generate bill number
billSchema.pre("save", function (next) {
  if (this.isNew && !this.billNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const timestamp = Date.now().toString().slice(-6);

    let prefix = "BILL";
    if (this.type === "return") prefix = "RET";
    else if (this.type === "exchange") prefix = "EXC";

    this.billNumber = `${prefix}-${year}${month}${day}-${timestamp}`;
  }

  // Calculate amounts if items are modified
  if (this.isModified("items") || this.isNew) {
    this.calculateAmounts();
  }

  // Set due date for credit payments
  if (this.payment.method === "credit" && !this.payment.dueDate) {
    this.payment.dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  }

  next();
});

// Calculate all amounts
billSchema.methods.calculateAmounts = function () {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  let totalCost = 0;
  let totalProfit = 0;

  this.items.forEach((item) => {
    const itemTotal = item.quantity * item.unitPrice;
    let discountAmount = 0;

    if (item.discount.type === "percentage") {
      discountAmount = (itemTotal * item.discount.value) / 100;
    } else {
      discountAmount = item.discount.value;
    }

    const discountedAmount = itemTotal - discountAmount;
    const taxAmount = (discountedAmount * item.tax.rate) / 100;
    const lineTotal = discountedAmount + taxAmount;

    // Update item calculations
    item.tax.amount = Math.round(taxAmount * 100) / 100;
    item.lineTotal = Math.round(lineTotal * 100) / 100;
    item.profit =
      Math.round((lineTotal - item.quantity * item.costPrice) * 100) / 100;

    subtotal += itemTotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;
    totalCost += item.quantity * item.costPrice;
    totalProfit += item.profit;
  });

  // Apply bill level discounts
  this.discounts.forEach((discount) => {
    if (discount.type === "percentage") {
      discount.amount =
        Math.round(((subtotal * discount.value) / 100) * 100) / 100;
    } else {
      discount.amount = discount.value;
    }
    totalDiscount += discount.amount;
  });

  const total = subtotal - totalDiscount + totalTax;
  const roundOff = Math.round(total) - total;
  const finalTotal = Math.round(total);

  this.amounts = {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    total: Math.round(total * 100) / 100,
    roundOff: Math.round(roundOff * 100) / 100,
    finalTotal,
    totalCost: Math.round(totalCost * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
  };

  // Update payment due amount
  this.payment.dueAmount = Math.max(0, finalTotal - this.payment.paidAmount);
};

// Virtual for profit margin
billSchema.virtual("profitMargin").get(function () {
  if (this.amounts.total === 0) return 0;
  return (
    Math.round((this.amounts.totalProfit / this.amounts.total) * 100 * 100) /
    100
  );
});

// Virtual for payment status
billSchema.virtual("paymentStatus").get(function () {
  if (this.payment.dueAmount <= 0) return "paid";
  if (this.payment.paidAmount === 0) return "unpaid";
  return "partial";
});

// Virtual for overdue status
billSchema.virtual("isOverdue").get(function () {
  return (
    this.payment.dueDate &&
    this.payment.dueDate < new Date() &&
    this.payment.dueAmount > 0
  );
});

// Indexes
billSchema.index({ mart: 1, billNumber: 1 }, { unique: true });
billSchema.index({ mart: 1, customer: 1 });
billSchema.index({ mart: 1, type: 1 });
billSchema.index({ mart: 1, status: 1 });
billSchema.index({ mart: 1, "payment.method": 1 });
billSchema.index({ mart: 1, "payment.status": 1 });
billSchema.index({ mart: 1, "payment.dueDate": 1 });
billSchema.index({ mart: 1, createdAt: -1 });
billSchema.index({ "customerInfo.phone": 1 });
billSchema.index({ tags: 1 });

billSchema.plugin(mongoosePaginate);

export default mongoose.model("Bill", billSchema);
