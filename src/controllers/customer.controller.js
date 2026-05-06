import Joi from "joi";
import Customer from "../models/Customer.js";
import Bill from "../models/Bill.js";
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

// Validation schemas
const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email(),
  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .required(),
  alternatePhone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string().default("USA"),
  }),
  dateOfBirth: Joi.date(),
  gender: Joi.string()
    .valid("male", "female", "other", "prefer_not_to_say")
    .default("prefer_not_to_say"),
  preferences: Joi.object({
    communicationMethod: Joi.string()
      .valid("email", "sms", "both", "none")
      .default("email"),
    categories: Joi.array().items(Joi.string().hex().length(24)),
    brands: Joi.array().items(Joi.string()),
  }),
  notes: Joi.array().items(
    Joi.object({
      note: Joi.string().max(500).required(),
      isPrivate: Joi.boolean().default(false),
    })
  ),
  tags: Joi.array().items(Joi.string()),
  creditLimit: Joi.number().min(0).default(0),
  source: Joi.string()
    .valid(
      "walk_in",
      "online",
      "referral",
      "marketing",
      "social_media",
      "other"
    )
    .default("walk_in"),
  referredBy: Joi.string().hex().length(24),
});

const updateCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  alternatePhone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
  dateOfBirth: Joi.date(),
  gender: Joi.string().valid("male", "female", "other", "prefer_not_to_say"),
  preferences: Joi.object({
    communicationMethod: Joi.string().valid("email", "sms", "both", "none"),
    categories: Joi.array().items(Joi.string().hex().length(24)),
    brands: Joi.array().items(Joi.string()),
  }),
  tags: Joi.array().items(Joi.string()),
  creditLimit: Joi.number().min(0),
  currentCredit: Joi.number(),
  isActive: Joi.boolean(),
  isBlacklisted: Joi.boolean(),
  blacklistReason: Joi.string(),
  source: Joi.string().valid(
    "walk_in",
    "online",
    "referral",
    "marketing",
    "social_media",
    "other"
  ),
  referredBy: Joi.string().hex().length(24),
});

/**
 * Create a new customer
 */
export const createCustomer = async (req, res) => {
  try {
    const { martId } = req.params;

    // Validate request body
    const { error, value } = createCustomerSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    // Check for duplicate phone or email within the mart
    const existingCustomer = await Customer.findOne({
      mart: martId,
      $or: [
        { phone: value.phone },
        ...(value.email ? [{ email: value.email }] : []),
      ],
    });

    if (existingCustomer) {
      return ResponseUtils.error(
        res,
        "Customer with same phone or email already exists",
        400
      );
    }

    // Add notes with user info
    if (value.notes && value.notes.length > 0) {
      value.notes = value.notes.map((note) => ({
        ...note,
        addedBy: req.user.id,
      }));
    }

    // Create customer
    const customer = new Customer({
      ...value,
      mart: martId,
      createdBy: req.user.id,
    });

    await customer.save();

    await customer.populate([
      { path: "createdBy", select: "name email" },
      { path: "preferences.categories", select: "name slug" },
      { path: "referredBy", select: "name phone" },
    ]);

    logger.info(
      `Customer created: ${customer.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(
      res,
      customer,
      "Customer created successfully",
      201
    );
  } catch (error) {
    logger.error("Error creating customer:", error);
    return ResponseUtils.error(res, "Error creating customer", 500);
  }
};

/**
 * Get all customers for a mart
 */
export const getCustomers = async (req, res) => {
  try {
    const { martId } = req.params;
    const {
      page = 1,
      limit = 20,
      isActive,
      isBlacklisted,
      loyaltyTier,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      tags,
    } = req.query;

    // Build filter
    const filter = { mart: martId };
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (isBlacklisted !== undefined)
      filter.isBlacklisted = isBlacklisted === "true";
    if (loyaltyTier) filter["loyalty.tier"] = loyaltyTier;
    if (tags) filter.tags = { $in: tags.split(",") };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { customerNumber: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: "createdBy", select: "name email" },
        { path: "preferences.categories", select: "name slug" },
        { path: "referredBy", select: "name phone" },
      ],
    };

    const customers = await Customer.paginate(filter, options);

    return ResponseUtils.success(
      res,
      "Customers retrieved successfully",
      customers
    );
  } catch (error) {
    logger.error("Error fetching customers:", error);
    return ResponseUtils.error(res, "Error fetching customers", 500);
  }
};

/**
 * Get customer by ID
 */
export const getCustomerById = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const customer = await Customer.findOne({ _id: id, mart: martId })
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email")
      .populate("preferences.categories", "name slug")
      .populate("referredBy", "name phone")
      .populate("notes.addedBy", "name email");

    if (!customer) {
      return ResponseUtils.error(res, "Customer not found", 404);
    }

    // Get recent bills
    const recentBills = await Bill.find({
      customer: customer._id,
      mart: martId,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("billNumber type amounts.finalTotal payment.method createdAt");

    const response = {
      ...customer.toObject(),
      recentBills,
    };

    return ResponseUtils.success(
      res,
      response,
      "Customer retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching customer:", error);
    return ResponseUtils.error(res, "Error fetching customer", 500);
  }
};

/**
 * Update customer
 */
export const updateCustomer = async (req, res) => {
  try {
    const { martId, id } = req.params;

    // Validate request body
    const { error, value } = updateCustomerSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    const customer = await Customer.findOne({ _id: id, mart: martId });
    if (!customer) {
      return ResponseUtils.error(res, "Customer not found", 404);
    }

    // Check for duplicate phone or email (if they're being updated)
    if (value.phone || value.email) {
      const duplicateFilter = {
        mart: martId,
        _id: { $ne: id },
        $or: [],
      };

      if (value.phone) duplicateFilter.$or.push({ phone: value.phone });
      if (value.email) duplicateFilter.$or.push({ email: value.email });

      const existingCustomer = await Customer.findOne(duplicateFilter);
      if (existingCustomer) {
        return ResponseUtils.error(
          res,
          "Customer with same phone or email already exists",
          400
        );
      }
    }

    // Update customer
    Object.assign(customer, value);
    customer.lastModifiedBy = req.user.id;

    await customer.save();

    await customer.populate([
      { path: "createdBy", select: "name email" },
      { path: "lastModifiedBy", select: "name email" },
      { path: "preferences.categories", select: "name slug" },
      { path: "referredBy", select: "name phone" },
    ]);

    logger.info(
      `Customer updated: ${customer.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(
      res,
      customer,
      "Customer updated successfully"
    );
  } catch (error) {
    logger.error("Error updating customer:", error);
    return ResponseUtils.error(res, "Error updating customer", 500);
  }
};

/**
 * Delete customer (soft delete)
 */
export const deleteCustomer = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const customer = await Customer.findOne({ _id: id, mart: martId });
    if (!customer) {
      return ResponseUtils.error(res, "Customer not found", 404);
    }

    // Soft delete
    customer.isActive = false;
    customer.lastModifiedBy = req.user.id;
    await customer.save();

    logger.info(
      `Customer deleted: ${customer.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(res, null, "Customer deleted successfully");
  } catch (error) {
    logger.error("Error deleting customer:", error);
    return ResponseUtils.error(res, "Error deleting customer", 500);
  }
};

/**
 * Add note to customer
 */
export const addCustomerNote = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const { note, isPrivate = false } = req.body;

    if (!note || note.trim().length === 0) {
      return ResponseUtils.error(res, "Note is required", 400);
    }

    const customer = await Customer.findOne({ _id: id, mart: martId });
    if (!customer) {
      return ResponseUtils.error(res, "Customer not found", 404);
    }

    customer.notes.push({
      note: note.trim(),
      addedBy: req.user.id,
      isPrivate,
    });

    await customer.save();

    await customer.populate("notes.addedBy", "name email");

    logger.info(
      `Note added to customer ${customer.name} by user ${req.user.id}`
    );

    return ResponseUtils.success(
      res,
      customer.notes,
      "Note added successfully"
    );
  } catch (error) {
    logger.error("Error adding customer note:", error);
    return ResponseUtils.error(res, "Error adding note", 500);
  }
};

/**
 * Update customer purchase data
 */
export const updateCustomerPurchase = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const { billAmount, loyaltyPoints = 0 } = req.body;

    if (!billAmount || billAmount <= 0) {
      return ResponseUtils.error(res, "Valid bill amount is required", 400);
    }

    const customer = await Customer.findOne({ _id: id, mart: martId });
    if (!customer) {
      return ResponseUtils.error(res, "Customer not found", 404);
    }

    // Update purchase statistics
    customer.purchase.totalOrders += 1;
    customer.purchase.totalSpent += billAmount;
    customer.purchase.averageOrderValue =
      customer.purchase.totalSpent / customer.purchase.totalOrders;
    customer.purchase.lastPurchaseDate = new Date();

    if (!customer.purchase.firstPurchaseDate) {
      customer.purchase.firstPurchaseDate = new Date();
    }

    // Update loyalty points
    customer.loyalty.points += loyaltyPoints;

    await customer.save();

    logger.info(
      `Purchase updated for customer ${customer.name}: amount ${billAmount}, points ${loyaltyPoints}`
    );

    return ResponseUtils.success(
      res,
      customer,
      "Customer purchase updated successfully"
    );
  } catch (error) {
    logger.error("Error updating customer purchase:", error);
    return ResponseUtils.error(res, "Error updating purchase", 500);
  }
};

/**
 * Get customer analytics
 */
export const getCustomerAnalytics = async (req, res) => {
  try {
    const { martId } = req.params;

    const analytics = await Customer.aggregate([
      { $match: { mart: martId } },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          activeCustomers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          blacklistedCustomers: {
            $sum: { $cond: [{ $eq: ["$isBlacklisted", true] }, 1, 0] },
          },
          totalSpent: { $sum: "$purchase.totalSpent" },
          avgSpent: { $avg: "$purchase.totalSpent" },
          totalOrders: { $sum: "$purchase.totalOrders" },
          loyaltyTiers: {
            $push: "$loyalty.tier",
          },
          sources: {
            $push: "$source",
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalCustomers: 1,
          activeCustomers: 1,
          blacklistedCustomers: 1,
          totalSpent: { $round: ["$totalSpent", 2] },
          avgSpent: { $round: ["$avgSpent", 2] },
          totalOrders: 1,
          loyaltyTiers: 1,
          sources: 1,
        },
      },
    ]);

    let result = analytics[0] || {
      totalCustomers: 0,
      activeCustomers: 0,
      blacklistedCustomers: 0,
      totalSpent: 0,
      avgSpent: 0,
      totalOrders: 0,
      loyaltyTiers: [],
      sources: [],
    };

    // Calculate tier distribution
    const tierCounts = result.loyaltyTiers.reduce((acc, tier) => {
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});

    // Calculate source distribution
    const sourceCounts = result.sources.reduce((acc, source) => {
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    result = {
      ...result,
      tierDistribution: tierCounts,
      sourceDistribution: sourceCounts,
    };

    delete result.loyaltyTiers;
    delete result.sources;

    return ResponseUtils.success(
      res,
      result,
      "Customer analytics retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching customer analytics:", error);
    return ResponseUtils.error(res, "Error fetching analytics", 500);
  }
};
