import Joi from "joi";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Inventory from "../models/Inventory.js";
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

// Validation schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(1000),
  category: Joi.string().hex().length(24).required(),
  brand: Joi.string().max(100),
  manufacturer: Joi.string().max(100),
  barcode: Joi.string().max(50),
  sku: Joi.string().max(50),
  pricing: Joi.object({
    costPrice: Joi.number().min(0).required(),
    sellingPrice: Joi.number().min(0).required(),
    mrp: Joi.number().min(0),
    discountType: Joi.string()
      .valid("percentage", "fixed")
      .default("percentage"),
    discountValue: Joi.number().min(0).default(0),
  }).required(),
  inventory: Joi.object({
    unit: Joi.string().required(),
    trackInventory: Joi.boolean().default(true),
    currentStock: Joi.number().min(0).default(0),
    minStock: Joi.number().min(0).default(10),
    maxStock: Joi.number().min(0).default(1000),
  }).required(),
  variants: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().required(),
        value: Joi.string().required(),
        priceAdjustment: Joi.number().default(0),
        costAdjustment: Joi.number().default(0),
        sku: Joi.string(),
      })
    )
    .default([]),
  specifications: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  images: Joi.array()
    .items(
      Joi.object({
        url: Joi.string().uri().required(),
        alt: Joi.string(),
        isPrimary: Joi.boolean().default(false),
      })
    )
    .default([]),
  tags: Joi.array().items(Joi.string()).default([]),
  isActive: Joi.boolean().default(true),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  description: Joi.string().max(1000),
  category: Joi.string().hex().length(24),
  brand: Joi.string().max(100),
  manufacturer: Joi.string().max(100),
  barcode: Joi.string().max(50),
  sku: Joi.string().max(50),
  pricing: Joi.object({
    costPrice: Joi.number().min(0),
    sellingPrice: Joi.number().min(0),
    mrp: Joi.number().min(0),
    discountType: Joi.string().valid("percentage", "fixed"),
    discountValue: Joi.number().min(0),
  }),
  inventory: Joi.object({
    unit: Joi.string(),
    trackInventory: Joi.boolean(),
    minStock: Joi.number().min(0),
    maxStock: Joi.number().min(0),
  }),
  variants: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      value: Joi.string().required(),
      priceAdjustment: Joi.number().default(0),
      costAdjustment: Joi.number().default(0),
      sku: Joi.string(),
    })
  ),
  specifications: Joi.object().pattern(Joi.string(), Joi.string()),
  images: Joi.array().items(
    Joi.object({
      url: Joi.string().uri().required(),
      alt: Joi.string(),
      isPrimary: Joi.boolean().default(false),
    })
  ),
  tags: Joi.array().items(Joi.string()),
  isActive: Joi.boolean(),
});

/**
 * Create a new product
 */
export const createProduct = async (req, res) => {
  try {
    const { martId } = req.params;

    // Validate request body
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    // Check if category exists
    const category = await Category.findById(value.category);
    if (!category || category.mart.toString() !== martId) {
      return ResponseUtils.error(res, "Category not found", 404);
    }

    // Check for duplicate SKU or barcode within the mart
    const existingProduct = await Product.findOne({
      mart: martId,
      $or: [{ sku: value.sku }, { barcode: value.barcode }],
    });

    if (existingProduct) {
      return ResponseUtils.error(
        res,
        "Product with same SKU or barcode already exists",
        400
      );
    }

    // Create product
    const product = new Product({
      ...value,
      mart: martId,
      createdBy: req.user.id,
    });

    await product.save();

    // Create inventory record if tracking is enabled
    if (value.inventory.trackInventory) {
      const inventory = new Inventory({
        product: product._id,
        mart: martId,
        stock: {
          available: value.inventory.currentStock || 0,
        },
        reorder: {
          level: value.inventory.minStock || 10,
          quantity: value.inventory.maxStock || 100,
        },
        cost: {
          average: value.pricing.costPrice,
          last: value.pricing.costPrice,
          total: (value.inventory.currentStock || 0) * value.pricing.costPrice,
        },
        createdBy: req.user.id,
      });

      await inventory.save();
    }

    // Populate the response
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "createdBy", select: "name email" },
    ]);

    logger.info(
      `Product created: ${product.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(
      res,
      product,
      "Product created successfully",
      201
    );
  } catch (error) {
    logger.error("Error creating product:", error);
    return ResponseUtils.error(res, "Error creating product", 500);
  }
};

/**
 * Get all products for a mart
 */
export const getProducts = async (req, res) => {
  try {
    const { martId } = req.params;
    const {
      page = 1,
      limit = 20,
      category,
      brand,
      isActive,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
      minPrice,
      maxPrice,
      inStock,
    } = req.query;

    // Build filter
    const filter = { mart: martId };
    if (category) filter.category = category;
    if (brand) filter.brand = new RegExp(brand, "i");
    if (isActive !== undefined) filter.isActive = isActive === "true";
    if (minPrice || maxPrice) {
      filter["pricing.sellingPrice"] = {};
      if (minPrice) filter["pricing.sellingPrice"].$gte = parseFloat(minPrice);
      if (maxPrice) filter["pricing.sellingPrice"].$lte = parseFloat(maxPrice);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
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
        { path: "category", select: "name slug" },
        { path: "createdBy", select: "name email" },
      ],
    };

    let products = await Product.paginate(filter, options);

    // Filter by stock if requested
    if (inStock !== undefined) {
      const productIds = products.docs.map((p) => p._id);
      const inventories = await Inventory.find({
        product: { $in: productIds },
        "stock.available": inStock === "true" ? { $gt: 0 } : { $lte: 0 },
      });
      const inStockIds = inventories.map((inv) => inv.product.toString());

      products.docs = products.docs.filter((p) =>
        inStock === "true"
          ? inStockIds.includes(p._id.toString())
          : !inStockIds.includes(p._id.toString())
      );
    }

    return ResponseUtils.success(
      res,
      products,
      "Products retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching products:", error);
    return ResponseUtils.error(res, "Error fetching products", 500);
  }
};

/**
 * Get product by ID
 */
export const getProductById = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const product = await Product.findOne({ _id: id, mart: martId })
      .populate("category", "name slug")
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email");

    if (!product) {
      return ResponseUtils.error(res, "Product not found", 404);
    }

    // Get inventory information
    const inventory = await Inventory.findOne({
      product: product._id,
      mart: martId,
    });

    const response = {
      ...product.toObject(),
      inventory: inventory || null,
    };

    return ResponseUtils.success(
      res,
      response,
      "Product retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching product:", error);
    return ResponseUtils.error(res, "Error fetching product", 500);
  }
};

/**
 * Update product
 */
export const updateProduct = async (req, res) => {
  try {
    const { martId, id } = req.params;

    // Validate request body
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return ResponseUtils.error(res, error.details[0].message, 400);
    }

    const product = await Product.findOne({ _id: id, mart: martId });
    if (!product) {
      return ResponseUtils.error(res, "Product not found", 404);
    }

    // Check if category exists (if category is being updated)
    if (value.category) {
      const category = await Category.findById(value.category);
      if (!category || category.mart.toString() !== martId) {
        return ResponseUtils.error(res, "Category not found", 404);
      }
    }

    // Check for duplicate SKU or barcode (if they're being updated)
    if (value.sku || value.barcode) {
      const duplicateFilter = {
        mart: martId,
        _id: { $ne: id },
        $or: [],
      };

      if (value.sku) duplicateFilter.$or.push({ sku: value.sku });
      if (value.barcode) duplicateFilter.$or.push({ barcode: value.barcode });

      const existingProduct = await Product.findOne(duplicateFilter);
      if (existingProduct) {
        return ResponseUtils.error(
          res,
          "Product with same SKU or barcode already exists",
          400
        );
      }
    }

    // Update product
    Object.assign(product, value);
    product.lastModifiedBy = req.user.id;

    await product.save();

    // Update inventory if pricing changed
    if (value.pricing) {
      await Inventory.findOneAndUpdate(
        { product: product._id, mart: martId },
        {
          "cost.last": value.pricing.costPrice || product.pricing.costPrice,
          lastModifiedBy: req.user.id,
        }
      );
    }

    await product.populate([
      { path: "category", select: "name slug" },
      { path: "createdBy", select: "name email" },
      { path: "lastModifiedBy", select: "name email" },
    ]);

    logger.info(
      `Product updated: ${product.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(res, product, "Product updated successfully");
  } catch (error) {
    logger.error("Error updating product:", error);
    return ResponseUtils.error(res, "Error updating product", 500);
  }
};

/**
 * Delete product (soft delete)
 */
export const deleteProduct = async (req, res) => {
  try {
    const { martId, id } = req.params;

    const product = await Product.findOne({ _id: id, mart: martId });
    if (!product) {
      return ResponseUtils.error(res, "Product not found", 404);
    }

    // Soft delete
    product.isActive = false;
    product.lastModifiedBy = req.user.id;
    await product.save();

    logger.info(
      `Product deleted: ${product.name} in mart ${martId} by user ${req.user.id}`
    );

    return ResponseUtils.success(res, null, "Product deleted successfully");
  } catch (error) {
    logger.error("Error deleting product:", error);
    return ResponseUtils.error(res, "Error deleting product", 500);
  }
};

/**
 * Bulk update products
 */
export const bulkUpdateProducts = async (req, res) => {
  try {
    const { martId } = req.params;
    const { productUpdates } = req.body;

    if (!Array.isArray(productUpdates) || productUpdates.length === 0) {
      return ResponseUtils.error(res, "Product updates array is required", 400);
    }

    const results = [];
    const errors = [];

    for (const update of productUpdates) {
      try {
        const { id, ...updateData } = update;

        const { error } = updateProductSchema.validate(updateData);
        if (error) {
          errors.push({ id, error: error.details[0].message });
          continue;
        }

        const product = await Product.findOneAndUpdate(
          { _id: id, mart: martId },
          { ...updateData, lastModifiedBy: req.user.id },
          { new: true }
        );

        if (product) {
          results.push({ id, status: "updated", product });
        } else {
          errors.push({ id, error: "Product not found" });
        }
      } catch (err) {
        errors.push({ id: update.id, error: err.message });
      }
    }

    logger.info(
      `Bulk update completed in mart ${martId} by user ${req.user.id}: ${results.length} success, ${errors.length} errors`
    );

    return ResponseUtils.success(
      res,
      { results, errors },
      "Bulk update completed"
    );
  } catch (error) {
    logger.error("Error in bulk update:", error);
    return ResponseUtils.error(res, "Error in bulk update", 500);
  }
};

/**
 * Get product analytics
 */
export const getProductAnalytics = async (req, res) => {
  try {
    const { martId } = req.params;

    const analytics = await Product.aggregate([
      { $match: { mart: martId } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          avgPrice: { $avg: "$pricing.sellingPrice" },
          totalValue: { $sum: "$pricing.sellingPrice" },
          categories: { $addToSet: "$category" },
        },
      },
      {
        $project: {
          _id: 0,
          totalProducts: 1,
          activeProducts: 1,
          inactiveProducts: {
            $subtract: ["$totalProducts", "$activeProducts"],
          },
          avgPrice: { $round: ["$avgPrice", 2] },
          totalValue: { $round: ["$totalValue", 2] },
          categoriesCount: { $size: "$categories" },
        },
      },
    ]);

    const result = analytics[0] || {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      avgPrice: 0,
      totalValue: 0,
      categoriesCount: 0,
    };

    return ResponseUtils.success(
      res,
      result,
      "Product analytics retrieved successfully"
    );
  } catch (error) {
    logger.error("Error fetching product analytics:", error);
    return ResponseUtils.error(res, "Error fetching analytics", 500);
  }
};
