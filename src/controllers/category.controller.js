import Category from "../models/Category.js";
import ResponseUtils from "../utils/responseUtils.js";
import logger from "../utils/logger.js";

export const createCategory = async (req, res) => {
  try {
    const { martId } = req.params;
    const { name, description } = req.body;
    if (!name || typeof name !== "string") {
      return ResponseUtils.error(res, "Category name is required", 400);
    }
    const category = await Category.create({
      name: name.trim(),
      description,
      mart: martId,
      createdBy: req.user.id,
    });
    return ResponseUtils.created(
      res,
      "Category created successfully",
      category
    );
  } catch (error) {
    if (error.code === 11000) {
      return ResponseUtils.error(
        res,
        "Category already exists for this mart",
        400
      );
    }
    logger.error(`createCategory: ${error.message}`);
    return ResponseUtils.error(res, "Error creating category", 500);
  }
};

export const getCategories = async (req, res) => {
  try {
    const { martId } = req.params;
    const categories = await Category.find({ mart: martId }).sort({
      sortOrder: 1,
      name: 1,
    });
    return ResponseUtils.success(
      res,
      "Categories retrieved successfully",
      categories
    );
  } catch (error) {
    logger.error(`getCategories: ${error.message}`);
    return ResponseUtils.error(res, "Error fetching categories", 500);
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const category = await Category.findOne({ _id: id, mart: martId });
    if (!category) {
      return ResponseUtils.notFound(res, "Category not found");
    }
    return ResponseUtils.success(
      res,
      "Category retrieved successfully",
      category
    );
  } catch (error) {
    logger.error(`getCategoryById: ${error.message}`);
    return ResponseUtils.error(res, "Error fetching category", 500);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const category = await Category.findOne({ _id: id, mart: martId });
    if (!category) {
      return ResponseUtils.notFound(res, "Category not found");
    }
    const { name, description, isActive } = req.body;
    if (name != null) category.name = String(name).trim();
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;
    await category.save();
    return ResponseUtils.success(
      res,
      "Category updated successfully",
      category
    );
  } catch (error) {
    logger.error(`updateCategory: ${error.message}`);
    return ResponseUtils.error(res, "Error updating category", 500);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { martId, id } = req.params;
    const category = await Category.findOne({ _id: id, mart: martId });
    if (!category) {
      return ResponseUtils.notFound(res, "Category not found");
    }
    category.isActive = false;
    await category.save();
    return ResponseUtils.success(res, "Category deleted successfully", null);
  } catch (error) {
    logger.error(`deleteCategory: ${error.message}`);
    return ResponseUtils.error(res, "Error deleting category", 500);
  }
};
