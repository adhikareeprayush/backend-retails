import mongoose from "mongoose";

const inventoryMovementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "inward",
        "outward",
        "adjustment",
        "transfer",
        "damaged",
        "expired",
      ],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    unitCost: {
      type: Number,
      min: [0, "Unit cost cannot be negative"],
    },
    totalCost: {
      type: Number,
      min: [0, "Total cost cannot be negative"],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [200, "Reason cannot exceed 200 characters"],
    },
    reference: {
      type: String,
      trim: true,
    },
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
    },
    supplier: {
      type: String,
      trim: true,
    },
    batchNumber: {
      type: String,
      trim: true,
    },
    expiryDate: {
      type: Date,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    mart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Mart",
      required: true,
    },
    stock: {
      available: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Available stock cannot be negative"],
      },
      reserved: {
        type: Number,
        default: 0,
        min: [0, "Reserved stock cannot be negative"],
      },
      damaged: {
        type: Number,
        default: 0,
        min: [0, "Damaged stock cannot be negative"],
      },
      expired: {
        type: Number,
        default: 0,
        min: [0, "Expired stock cannot be negative"],
      },
    },
    reorder: {
      level: {
        type: Number,
        default: 10,
        min: [0, "Reorder level cannot be negative"],
      },
      quantity: {
        type: Number,
        default: 50,
        min: [1, "Reorder quantity must be at least 1"],
      },
      autoReorder: {
        type: Boolean,
        default: false,
      },
    },
    cost: {
      average: {
        type: Number,
        default: 0,
        min: [0, "Average cost cannot be negative"],
      },
      last: {
        type: Number,
        default: 0,
        min: [0, "Last cost cannot be negative"],
      },
      total: {
        type: Number,
        default: 0,
        min: [0, "Total cost cannot be negative"],
      },
    },
    location: {
      warehouse: {
        type: String,
        trim: true,
        default: "main",
      },
      aisle: {
        type: String,
        trim: true,
      },
      shelf: {
        type: String,
        trim: true,
      },
      bin: {
        type: String,
        trim: true,
      },
    },
    batches: [
      {
        batchNumber: {
          type: String,
          required: true,
          trim: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0, "Batch quantity cannot be negative"],
        },
        costPrice: {
          type: Number,
          required: true,
          min: [0, "Batch cost price cannot be negative"],
        },
        supplier: {
          type: String,
          trim: true,
        },
        manufacturingDate: {
          type: Date,
        },
        expiryDate: {
          type: Date,
        },
        receivedDate: {
          type: Date,
          default: Date.now,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
    movements: [inventoryMovementSchema],
    alerts: {
      lowStock: {
        enabled: {
          type: Boolean,
          default: true,
        },
        threshold: {
          type: Number,
          default: 10,
          min: [0, "Low stock threshold cannot be negative"],
        },
      },
      expiry: {
        enabled: {
          type: Boolean,
          default: true,
        },
        daysBefore: {
          type: Number,
          default: 30,
          min: [1, "Expiry alert days must be at least 1"],
        },
      },
      overstock: {
        enabled: {
          type: Boolean,
          default: false,
        },
        threshold: {
          type: Number,
          default: 1000,
          min: [1, "Overstock threshold must be at least 1"],
        },
      },
    },
    lastCounted: {
      date: {
        type: Date,
      },
      countedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      physicalCount: {
        type: Number,
        min: [0, "Physical count cannot be negative"],
      },
      systemCount: {
        type: Number,
        min: [0, "System count cannot be negative"],
      },
      variance: {
        type: Number,
      },
    },
    settings: {
      trackBatches: {
        type: Boolean,
        default: false,
      },
      trackExpiry: {
        type: Boolean,
        default: false,
      },
      allowNegativeStock: {
        type: Boolean,
        default: false,
      },
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Calculate total stock
inventorySchema.virtual("totalStock").get(function () {
  return (
    this.stock.available +
    this.stock.reserved +
    this.stock.damaged +
    this.stock.expired
  );
});

// Check if stock is low
inventorySchema.virtual("isLowStock").get(function () {
  return (
    this.alerts.lowStock.enabled &&
    this.stock.available <= this.alerts.lowStock.threshold
  );
});

// Check if reorder is needed
inventorySchema.virtual("needsReorder").get(function () {
  return this.stock.available <= this.reorder.level;
});

// Get expiring batches
inventorySchema.virtual("expiringBatches").get(function () {
  if (!this.alerts.expiry.enabled) return [];

  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + this.alerts.expiry.daysBefore);

  return this.batches.filter(
    (batch) =>
      batch.isActive &&
      batch.expiryDate &&
      batch.expiryDate <= alertDate &&
      batch.quantity > 0
  );
});

// Stock movement methods
inventorySchema.methods.addStock = function (quantity, unitCost, data = {}) {
  const movement = {
    type: "inward",
    quantity,
    unitCost,
    totalCost: quantity * unitCost,
    performedBy: data.performedBy,
    reason: data.reason || "Stock addition",
    reference: data.reference,
    supplier: data.supplier,
    batchNumber: data.batchNumber,
    expiryDate: data.expiryDate,
    notes: data.notes,
  };

  this.movements.push(movement);
  this.stock.available += quantity;

  // Update cost calculations
  const totalValue = this.cost.total + quantity * unitCost;
  const totalQuantity = this.totalStock;
  this.cost.average = totalQuantity > 0 ? totalValue / totalQuantity : 0;
  this.cost.last = unitCost;
  this.cost.total = totalValue;

  // Add batch if batch tracking is enabled
  if (this.settings.trackBatches && data.batchNumber) {
    const existingBatch = this.batches.find(
      (b) => b.batchNumber === data.batchNumber
    );
    if (existingBatch) {
      existingBatch.quantity += quantity;
    } else {
      this.batches.push({
        batchNumber: data.batchNumber,
        quantity,
        costPrice: unitCost,
        supplier: data.supplier,
        manufacturingDate: data.manufacturingDate,
        expiryDate: data.expiryDate,
      });
    }
  }

  return movement;
};

inventorySchema.methods.removeStock = function (quantity, data = {}) {
  if (!this.settings.allowNegativeStock && this.stock.available < quantity) {
    throw new Error("Insufficient stock available");
  }

  const movement = {
    type: "outward",
    quantity: -quantity,
    unitCost: this.cost.average,
    totalCost: quantity * this.cost.average,
    performedBy: data.performedBy,
    reason: data.reason || "Stock removal",
    reference: data.reference,
    bill: data.bill,
    notes: data.notes,
  };

  this.movements.push(movement);
  this.stock.available = Math.max(0, this.stock.available - quantity);

  // Remove from batches if FIFO
  if (this.settings.trackBatches) {
    let remainingToRemove = quantity;
    const activeBatches = this.batches
      .filter((b) => b.isActive && b.quantity > 0)
      .sort((a, b) => a.receivedDate - b.receivedDate);

    for (const batch of activeBatches) {
      if (remainingToRemove <= 0) break;

      const removeFromBatch = Math.min(batch.quantity, remainingToRemove);
      batch.quantity -= removeFromBatch;
      remainingToRemove -= removeFromBatch;

      if (batch.quantity === 0) {
        batch.isActive = false;
      }
    }
  }

  return movement;
};

inventorySchema.methods.adjustStock = function (newQuantity, data = {}) {
  const currentStock = this.stock.available;
  const difference = newQuantity - currentStock;

  const movement = {
    type: "adjustment",
    quantity: difference,
    unitCost: this.cost.average,
    totalCost: Math.abs(difference) * this.cost.average,
    performedBy: data.performedBy,
    reason: data.reason || "Stock adjustment",
    reference: data.reference,
    notes: data.notes,
  };

  this.movements.push(movement);
  this.stock.available = newQuantity;

  // Update last counted information
  this.lastCounted = {
    date: new Date(),
    countedBy: data.performedBy,
    physicalCount: newQuantity,
    systemCount: currentStock,
    variance: difference,
  };

  return movement;
};

// Indexes
inventorySchema.index({ product: 1, mart: 1 }, { unique: true });
inventorySchema.index({ mart: 1, "stock.available": 1 });
inventorySchema.index({ mart: 1, isActive: 1 });
inventorySchema.index({ "batches.expiryDate": 1 });
inventorySchema.index({ "batches.batchNumber": 1 });
inventorySchema.index({ "movements.type": 1 });
inventorySchema.index({ "movements.createdAt": -1 });
inventorySchema.index({ updatedAt: -1 });

export default mongoose.model("Inventory", inventorySchema);
