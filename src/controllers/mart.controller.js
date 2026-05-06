import Joi from "joi";
import Mart from "../models/Mart.js";
import User from "../models/User.js";
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

const refIdString = (ref) => {
  if (!ref) return "";
  if (typeof ref === "object" && ref._id) return ref._id.toString();
  return ref.toString();
};

const userReqIdString = (user) =>
  user._id ? user._id.toString() : String(user.id);

// Validation schemas
const createMartSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500),
  category: Joi.string()
    .valid(
      "grocery",
      "supermarket",
      "convenience",
      "pharmacy",
      "electronics",
      "clothing",
      "restaurant",
      "other"
    )
    .required(),
  address: Joi.object({
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().default("USA"),
  }).required(),
  contact: Joi.object({
    phone: Joi.string()
      .pattern(/^\+?[\d\s\-\(\)]+$/)
      .required(),
    email: Joi.string().email(),
    website: Joi.string().uri(),
    socialMedia: Joi.object({
      facebook: Joi.string().uri(),
      instagram: Joi.string().uri(),
      twitter: Joi.string().uri(),
    }),
  }).required(),
  businessInfo: Joi.object({
    licenseNumber: Joi.string(),
    taxId: Joi.string(),
    gstNumber: Joi.string(),
    registrationDate: Joi.date(),
    legalStructure: Joi.string().valid(
      "sole_proprietorship",
      "partnership",
      "llc",
      "corporation",
      "other"
    ),
  }),
  settings: Joi.object({
    currency: Joi.string().length(3).default("USD"),
    timezone: Joi.string().default("America/New_York"),
    language: Joi.string().length(2).default("en"),
    businessHours: Joi.object({
      monday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      tuesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      wednesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      thursday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      friday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      saturday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      sunday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
    }),
  }),
});

const updateMartSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500),
  category: Joi.string().valid(
    "grocery",
    "supermarket",
    "convenience",
    "pharmacy",
    "electronics",
    "clothing",
    "restaurant",
    "other"
  ),
  address: Joi.object({
    street: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    zipCode: Joi.string(),
    country: Joi.string(),
  }),
  contact: Joi.object({
    phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
    email: Joi.string().email(),
    website: Joi.string().uri(),
    socialMedia: Joi.object({
      facebook: Joi.string().uri(),
      instagram: Joi.string().uri(),
      twitter: Joi.string().uri(),
    }),
  }),
  businessInfo: Joi.object({
    licenseNumber: Joi.string(),
    taxId: Joi.string(),
    gstNumber: Joi.string(),
    registrationDate: Joi.date(),
    legalStructure: Joi.string().valid(
      "sole_proprietorship",
      "partnership",
      "llc",
      "corporation",
      "other"
    ),
  }),
  settings: Joi.object({
    currency: Joi.string().length(3),
    timezone: Joi.string(),
    language: Joi.string().length(2),
    businessHours: Joi.object({
      monday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      tuesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      wednesday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      thursday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      friday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      saturday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
      sunday: Joi.object({
        open: Joi.string().pattern(/^\d{2}:\d{2}$/),
        close: Joi.string().pattern(/^\d{2}:\d{2}$/),
        closed: Joi.boolean(),
      }),
    }),
  }),
  isActive: Joi.boolean(),
});

/**
 * Create a new mart
 */
export const createMart = async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createMartSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    // Check if user already owns a mart
    const existingMart = await Mart.findOne({ owner: req.user.id });
    if (existingMart) {
      return ResponseUtils.error(res, "User already owns a mart", 400);
    }

    // Create mart
    const mart = new Mart({
      ...value,
      owner: req.user.id,
      createdBy: req.user.id,
    });

    await mart.save();

    // Update user role to mart_owner
    await User.findByIdAndUpdate(req.user.id, { role: "mart_owner" });

    logger.info(`Mart created: ${mart.name} by user ${req.user.id}`);

    return ResponseUtils.created(res, "Mart created successfully", mart);
  } catch (error) {
    logger.error("Error creating mart:", error);
    return ResponseUtils.error(res, "Error creating mart", 500);
  }
};

/**
 * Get all marts (admin only)
 */
export const getMarts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter
    const filter = {};
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
        { "address.state": { $regex: search, $options: "i" } },
      ];
    }

    // Sort options
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [{ path: "owner", select: "name email" }],
    };

    const marts = await Mart.paginate(filter, options);

    return ResponseUtils.success(res, "Marts retrieved successfully", marts);
  } catch (error) {
    logger.error("Error fetching marts:", error);
    return ResponseUtils.error(res, "Error fetching marts", 500);
  }
};

/**
 * Get mart by ID
 */
export const getMartById = async (req, res) => {
  try {
    const { id } = req.params;

    const mart = await Mart.findById(id)
      .populate("owner", "name email")
      .populate("staff.user", "name email");

    if (!mart) {
      return ResponseUtils.error(res, "Mart not found", 404);
    }

    const uid = userReqIdString(req.user);
    if (
      req.user.role !== "admin" &&
      refIdString(mart.owner) !== uid &&
      !mart.staff.some((s) => refIdString(s.user) === uid)
    ) {
      return ResponseUtils.error(res, "Access denied", 403);
    }

    return ResponseUtils.success(res, "Mart retrieved successfully", mart);
  } catch (error) {
    logger.error("Error fetching mart:", error);
    return ResponseUtils.error(res, "Error fetching mart", 500);
  }
};

/**
 * Update mart
 */
export const updateMart = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate request body
    const { error, value } = updateMartSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    const mart = await Mart.findById(id);
    if (!mart) {
      return ResponseUtils.error(res, "Mart not found", 404);
    }

    if (
      req.user.role !== "admin" &&
      refIdString(mart.owner) !== userReqIdString(req.user)
    ) {
      return ResponseUtils.error(res, "Access denied", 403);
    }

    // Update mart
    Object.assign(mart, value);
    mart.lastModifiedBy = req.user.id;

    await mart.save();

    logger.info(`Mart updated: ${mart.name} by user ${req.user.id}`);

    return ResponseUtils.success(res, "Mart updated successfully", mart);
  } catch (error) {
    logger.error("Error updating mart:", error);
    return ResponseUtils.error(res, "Error updating mart", 500);
  }
};

/**
 * Delete mart (admin only)
 */
export const deleteMart = async (req, res) => {
  try {
    const { id } = req.params;

    const mart = await Mart.findById(id);
    if (!mart) {
      return ResponseUtils.error(res, "Mart not found", 404);
    }

    // Soft delete
    mart.isActive = false;
    mart.lastModifiedBy = req.user.id;
    await mart.save();

    logger.info(`Mart deleted: ${mart.name} by user ${req.user.id}`);

    return ResponseUtils.success(res, "Mart deleted successfully", null);
  } catch (error) {
    logger.error("Error deleting mart:", error);
    return ResponseUtils.error(res, "Error deleting mart", 500);
  }
};

/**
 * Get my mart (for mart owner)
 */
export const getMyMart = async (req, res) => {
  try {
    const mart = await Mart.findOne({ owner: req.user.id }).populate(
      "staff.user",
      "name email"
    );

    if (!mart) {
      return ResponseUtils.error(res, "No mart found for this user", 404);
    }

    return ResponseUtils.success(res, "Mart retrieved successfully", mart);
  } catch (error) {
    logger.error("Error fetching user mart:", error);
    return ResponseUtils.error(res, "Error fetching mart", 500);
  }
};

/**
 * Add staff to mart
 */
export const addStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, role, permissions } = req.body;

    const mart = await Mart.findById(id);
    if (!mart) {
      return ResponseUtils.error(res, "Mart not found", 404);
    }

    if (
      req.user.role !== "admin" &&
      refIdString(mart.owner) !== userReqIdString(req.user)
    ) {
      return ResponseUtils.error(res, "Access denied", 403);
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return ResponseUtils.error(res, "User not found", 404);
    }

    // Check if user is already staff
    const existingStaff = mart.staff.find((s) => s.user.toString() === userId);
    if (existingStaff) {
      return ResponseUtils.error(res, "User is already a staff member", 400);
    }

    // Add staff
    mart.staff.push({
      user: userId,
      role: role || "cashier",
      permissions: permissions || ["view_products", "create_bills"],
      addedBy: req.user.id,
    });

    await mart.save();

    logger.info(`Staff added to mart ${mart.name}: ${user.name}`);

    return ResponseUtils.success(res, "Staff added successfully", mart.staff);
  } catch (error) {
    logger.error("Error adding staff:", error);
    return ResponseUtils.error(res, "Error adding staff", 500);
  }
};

/**
 * Remove staff from mart
 */
export const removeStaff = async (req, res) => {
  try {
    const { id, staffId } = req.params;

    const mart = await Mart.findById(id);
    if (!mart) {
      return ResponseUtils.error(res, "Mart not found", 404);
    }

    if (
      req.user.role !== "admin" &&
      refIdString(mart.owner) !== userReqIdString(req.user)
    ) {
      return ResponseUtils.error(res, "Access denied", 403);
    }

    // Remove staff
    mart.staff = mart.staff.filter((s) => s._id.toString() !== staffId);
    await mart.save();

    logger.info(`Staff removed from mart ${mart.name}`);

    return ResponseUtils.success(res, "Staff removed successfully", mart.staff);
  } catch (error) {
    logger.error("Error removing staff:", error);
    return ResponseUtils.error(res, "Error removing staff", 500);
  }
};
