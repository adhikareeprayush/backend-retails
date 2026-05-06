import Joi from "joi";
import Bill from "../models/Bill.js";
import Customer from "../models/Customer.js";
import Product from "../models/Product.js";
import Inventory from "../models/Inventory.js";
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

// Validation schemas
const billItemSchema = Joi.object({
  product: Joi.string().hex().length(24).required(),
  quantity: Joi.number().min(0.01).required(),
  unitPrice: Joi.number().min(0).required(),
  discount: Joi.object({
    type: Joi.string().valid("percentage", "fixed").default("percentage"),
    value: Joi.number().min(0).default(0),
  }).default({}),
});

const createBillSchema = Joi.object({
  customer: Joi.string().hex().length(24),
  customerInfo: Joi.object({
    name: Joi.string(),
    phone: Joi.string(),
    email: Joi.string().email(),
  }),
  type: Joi.string().valid("sale", "return", "exchange").default("sale"),
  items: Joi.array().items(billItemSchema).min(1).required(),
  payment: Joi.object({
    method: Joi.string()
      .valid("cash", "card", "upi", "netbanking", "credit", "multiple")
      .required(),
    methods: Joi.array().items(
      Joi.object({
        type: Joi.string()
          .valid("cash", "card", "upi", "netbanking", "credit")
          .required(),
        amount: Joi.number().min(0).required(),
        reference: Joi.string(),
      })
    ),
    paidAmount: Joi.number().min(0).default(0),
    dueDate: Joi.date(),
  }).required(),
  discounts: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid("percentage", "fixed", "loyalty", "coupon")
          .required(),
        value: Joi.number().min(0).required(),
        description: Joi.string(),
      })
    )
    .default([]),
  notes: Joi.object({
    customer: Joi.string().max(500),
    internal: Joi.string().max(500),
  }),
  originalBill: Joi.string().hex().length(24),
  returnReason: Joi.string().max(200),
  tags: Joi.array().items(Joi.string()).default([]),
});

/**
 * Create a new bill
 */
export const createBill = async (req, res) => {
  try {
    const { martId } = req.params;

    // Validate request body
    const { error, value } = createBillSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    // Validate customer if provided
    let customer = null;
    if (value.customer) {
      customer = await Customer.findOne({ _id: value.customer, mart: martId });
      if (!customer) {
        return ResponseUtils.error(res, "Customer not found", 404);
      }
    }

    // Validate and populate items
    const populatedItems = [];
    for (const item of value.items) {
      const product = await Product.findOne({
        _id: item.product,
        mart: martId,
      });
      if (!product) {
        return ResponseUtils.error(
          res,
          `Product not found: ${item.product}`,
          404
        );
      }

      // Check inventory for sales
      if (value.type === "sale") {
        const inventory = await Inventory.findOne({
          product: product._id,
          mart: martId,
        });
        if (inventory && inventory.stock.available < item.quantity) {
          return ResponseUtils.error(
            res,
            `Insufficient stock for product: ${product.name}`,
            400
          );
        }
      }

      populatedItems.push({
        ...item,
        productName: product.name,
        productCode: product.sku || product.barcode || product._id.toString(),
        category: product.category,
        unit: product.inventory?.unit || "pcs",
        costPrice: product.pricing.cost,
        tax: {
          rate: product.tax?.rate || 0,
          amount: 0, // Will be calculated
        },
      });
    }

    // Create bill
    const bill = new Bill({
      ...value,
      items: populatedItems,
      mart: martId,
      createdBy: req.user.id,
    });

    // Calculate amounts
    bill.calculateAmounts();

    // Set payment status
    if (value.payment.method === "multiple" && value.payment.methods) {
      bill.payment.paidAmount = value.payment.methods.reduce(
        (sum, method) => sum + method.amount,
        0
      );
    } else {
      bill.payment.paidAmount =
        value.payment.paidAmount || bill.amounts.finalTotal;
    }

    bill.payment.dueAmount = Math.max(
      0,
      bill.amounts.finalTotal - bill.payment.paidAmount
    );

    await bill.save();

    // Update inventory for sales
    if (value.type === "sale") {
      for (const item of bill.items) {
        const inventory = await Inventory.findOne({
          product: item.product,
          mart: martId,
        });
        if (inventory) {
          inventory.removeStock(item.quantity, {
            performedBy: req.user.id,
            reason: "Sale",
            bill: bill._id,
          });
          await inventory.save();
        }
      }
    }

    // Update customer purchase data
    if (customer && value.type === "sale") {
      const loyaltyPoints = Math.floor(bill.amounts.finalTotal / 10); // 1 point per $10
      customer.purchase.totalOrders += 1;
      customer.purchase.totalSpent += bill.amounts.finalTotal;
      customer.purchase.averageOrderValue =
        customer.purchase.totalSpent / customer.purchase.totalOrders;
      customer.purchase.lastPurchaseDate = new Date();
      customer.loyalty.points += loyaltyPoints;

      if (!customer.purchase.firstPurchaseDate) {
        customer.purchase.firstPurchaseDate = new Date();
      }

      await customer.save();
    }

    // Populate the response
    await bill.populate([
      { path: "customer", select: "name phone email customerNumber" },
      { path: "createdBy", select: "name email" },
      { path: "items.product", select: "name sku barcode" },
      { path: "items.category", select: "name" },
    ]);

    logger.info(
      `Bill created: ${bill.billNumber} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(res, bill, "Bill created successfully", 201);
  } catch (error) {
    logger.error("Error creating bill:", error);
    return ResponseUtils.error(res, "Error creating bill", 500);
  }
};

/**
 * Get all bills for a mart
 */
export const getBills = async (req, res) => {
  try {
    const { martId } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      status,
      paymentMethod,
      paymentStatus,
      customer,
      search,
      startDate,
      endDate,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = { mart: martId };
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (paymentMethod) filter["payment.method"] = paymentMethod;
    if (customer) filter.customer = customer;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { billNumber: { $regex: search, $options: "i" } },
        { "customerInfo.name": { $regex: search, $options: "i" } },
        { "customerInfo.phone": { $regex: search, $options: "i" } },
      ];
    }

    // Add payment status filter
    if (paymentStatus) {
      if (paymentStatus === "paid") {
        filter["payment.dueAmount"] = { $lte: 0 };
      } else if (paymentStatus === "unpaid") {
        filter["payment.paidAmount"] = 0;
      } else if (paymentStatus === "partial") {
        filter["payment.paidAmount"] = { $gt: 0 };
        filter["payment.dueAmount"] = { $gt: 0 };
      }
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: "customer", select: "name phone email customerNumber" },
        { path: "createdBy", select: "name email" },
      ],
    };

    const bills = await Bill.paginate(filter, options);

    return ResponseUtils.success(res, "Bills retrieved successfully", bills);
  } catch (error) {
    logger.error("Error fetching bills:", error);
    return ResponseUtils.error(res, "Error fetching bills", 500);
  }
};

/**
 * Get bill by ID
 */
export const getBillById = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const bill = await Bill.findOne({ _id: id, mart: martId })
      .populate("customer", "name phone email customerNumber")
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("items.product", "name sku barcode images")
      .populate("items.category", "name")
      .populate("originalBill", "billNumber type");

    if (!bill) {
      return ResponseUtils.error(res, "Bill not found", 404);
    }

    return ResponseUtils.success(res, bill, "Bill retrieved successfully");
  } catch (error) {
    logger.error("Error fetching bill:", error);
    return ResponseUtils.error(res, "Error fetching bill", 500);
  }
};

/**
 * Update bill payment
 */
export const updateBillPayment = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const { paidAmount, paymentMethod, reference } = req.body;

    if (!paidAmount || paidAmount <= 0) {
      return ResponseUtils.error(res, "Valid paid amount is required", 400);
    }

    const bill = await Bill.findOne({ _id: id, mart: martId });
    if (!bill) {
      return ResponseUtils.error(res, "Bill not found", 404);
    }

    if (bill.payment.dueAmount <= 0) {
      return ResponseUtils.error(res, "Bill is already fully paid", 400);
    }

    const maxPayment = bill.payment.dueAmount;
    const actualPayment = Math.min(paidAmount, maxPayment);

    // Update payment
    bill.payment.paidAmount += actualPayment;
    bill.payment.dueAmount = Math.max(
      0,
      bill.amounts.finalTotal - bill.payment.paidAmount
    );

    // Add payment method if provided
    if (paymentMethod) {
      bill.payment.methods.push({
        type: paymentMethod,
        amount: actualPayment,
        reference,
      });

      // Update main payment method if it was credit
      if (bill.payment.method === "credit" && bill.payment.dueAmount === 0) {
        bill.payment.method = paymentMethod;
      }
    }

    bill.lastModifiedBy = req.user.id;
    await bill.save();

    logger.info(
      `Payment updated for bill ${bill.billNumber}: ${actualPayment}`
    );

    return ResponseUtils.success(res, bill, "Payment updated successfully");
  } catch (error) {
    logger.error("Error updating bill payment:", error);
    return ResponseUtils.error(res, "Error updating payment", 500);
  }
};

/**
 * Cancel bill
 */
export const cancelBill = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const { reason } = req.body;

    const bill = await Bill.findOne({ _id: id, mart: martId });
    if (!bill) {
      return ResponseUtils.error(res, "Bill not found", 404);
    }

    if (bill.status === "cancelled") {
      return ResponseUtils.error(res, "Bill is already cancelled", 400);
    }

    // Restore inventory for sales
    if (bill.type === "sale" && bill.status === "completed") {
      for (const item of bill.items) {
        const inventory = await Inventory.findOne({
          product: item.product,
          mart: martId,
        });
        if (inventory) {
          inventory.addStock(item.quantity, item.costPrice, {
            performedBy: req.user.id,
            reason: "Bill cancelled",
            reference: bill.billNumber,
          });
          await inventory.save();
        }
      }
    }

    // Update customer data if needed
    if (bill.customer && bill.type === "sale") {
      const customer = await Customer.findById(bill.customer);
      if (customer) {
        customer.purchase.totalOrders = Math.max(
          0,
          customer.purchase.totalOrders - 1
        );
        customer.purchase.totalSpent = Math.max(
          0,
          customer.purchase.totalSpent - bill.amounts.finalTotal
        );

        if (customer.purchase.totalOrders > 0) {
          customer.purchase.averageOrderValue =
            customer.purchase.totalSpent / customer.purchase.totalOrders;
        } else {
          customer.purchase.averageOrderValue = 0;
        }

        await customer.save();
      }
    }

    bill.status = "cancelled";
    bill.notes.internal = reason || "Bill cancelled";
    bill.lastModifiedBy = req.user.id;
    await bill.save();

    logger.info(`Bill cancelled: ${bill.billNumber} by user ${req.user.id}`);

    return ResponseUtils.success(res, bill, "Bill cancelled successfully");
  } catch (error) {
    logger.error("Error cancelling bill:", error);
    return ResponseUtils.error(res, "Error cancelling bill", 500);
  }
};

/**
 * Print bill
 */
export const printBill = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const bill = await Bill.findOne({ _id: id, mart: martId })
      .populate("customer", "name phone email customerNumber")
      .populate("items.product", "name sku")
      .populate("mart", "name address contact");

    if (!bill) {
      return ResponseUtils.error(res, "Bill not found", 404);
    }

    // Increment print count
    bill.printCount += 1;
    await bill.save();

    logger.info(`Bill printed: ${bill.billNumber} (count: ${bill.printCount})`);

    return ResponseUtils.success(res, bill, "Bill data retrieved for printing");
  } catch (error) {
    logger.error("Error printing bill:", error);
    return ResponseUtils.error(res, "Error printing bill", 500);
  }
};

/**
 * Get bill analytics
 */
export const getBillAnalytics = async (req, res) => {
  try {
    const { martId } = req.params;
    const { startDate, endDate } = req.query;

    const filter = { mart: martId };
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const analytics = await Bill.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalBills: { $sum: 1 },
          totalSales: {
            $sum: {
              $cond: [{ $eq: ["$type", "sale"] }, "$amounts.finalTotal", 0],
            },
          },
          totalReturns: {
            $sum: {
              $cond: [{ $eq: ["$type", "return"] }, "$amounts.finalTotal", 0],
            },
          },
          avgBillValue: { $avg: "$amounts.finalTotal" },
          totalProfit: { $sum: "$amounts.totalProfit" },
          cashSales: {
            $sum: {
              $cond: [
                { $eq: ["$payment.method", "cash"] },
                "$amounts.finalTotal",
                0,
              ],
            },
          },
          cardSales: {
            $sum: {
              $cond: [
                { $eq: ["$payment.method", "card"] },
                "$amounts.finalTotal",
                0,
              ],
            },
          },
          creditSales: {
            $sum: {
              $cond: [
                { $eq: ["$payment.method", "credit"] },
                "$amounts.finalTotal",
                0,
              ],
            },
          },
          pendingAmount: {
            $sum: {
              $cond: [
                { $gt: ["$payment.dueAmount", 0] },
                "$payment.dueAmount",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalBills: 1,
          totalSales: { $round: ["$totalSales", 2] },
          totalReturns: { $round: ["$totalReturns", 2] },
          netSales: {
            $round: [{ $subtract: ["$totalSales", "$totalReturns"] }, 2],
          },
          avgBillValue: { $round: ["$avgBillValue", 2] },
          totalProfit: { $round: ["$totalProfit", 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [{ $divide: ["$totalProfit", "$totalSales"] }, 100],
              },
              2,
            ],
          },
          paymentBreakdown: {
            cash: { $round: ["$cashSales", 2] },
            card: { $round: ["$cardSales", 2] },
            credit: { $round: ["$creditSales", 2] },
          },
          pendingAmount: { $round: ["$pendingAmount", 2] },
        },
      },
    ]);

    const result = analytics[0] || {
      totalBills: 0,
      totalSales: 0,
      totalReturns: 0,
      netSales: 0,
      avgBillValue: 0,
      totalProfit: 0,
      profitMargin: 0,
      paymentBreakdown: { cash: 0, card: 0, credit: 0 },
      pendingAmount: 0,
    };

    return ResponseUtils.success(
      res,
      result,
      "Bill analytics retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching bill analytics:", error);
    return ResponseUtils.error(res, "Error fetching analytics", 500);
  }
};
