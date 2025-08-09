import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the category
 *         name:
 *           type: string
 *           description: The category's name
 *         description:
 *           type: string
 *           description: The category's description
 *         slug:
 *           type: string
 *           description: URL-friendly version of the name
 *         parent:
 *           type: string
 *           description: Parent category ID for nested categories
 *         isActive:
 *           type: boolean
 *           description: Whether the category is active
 *         mart:
 *           type: string
 *           description: The mart ID this category belongs to
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the category was created
 *       example:
 *         id: 64f5e8b5c5d4e2f1a8b9c0d4
 *         name: Fresh Produce
 *         description: Fresh fruits and vegetables
 *         slug: fresh-produce
 *         parent: null
 *         isActive: true
 *         mart: 64f5e8b5c5d4e2f1a8b9c0d2
 *         createdAt: 2023-09-04T12:00:00.000Z
 *
 *     CategoryRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           example: Fresh Produce
 *         description:
 *           type: string
 *           example: Fresh fruits and vegetables
 *         parent:
 *           type: string
 *           example: null
 */

/**
 * @swagger
 * /marts/{martId}/categories:
 *   post:
 *     summary: Create a new category in a mart
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: martId
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Mart not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticateToken, createCategory);

/**
 * @swagger
 * /marts/{martId}/categories:
 *   get:
 *     summary: Get all categories in a mart
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: martId
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Filter by parent category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for category name
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Categories retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/", authenticateToken, getCategories);

/**
 * @swagger
 * /marts/{martId}/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: martId
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.get("/:id", authenticateToken, getCategoryById);

/**
 * @swagger
 * /marts/{martId}/categories/{id}:
 *   put:
 *     summary: Update a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: martId
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryRequest'
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Category updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
router.put("/:id", authenticateToken, updateCategory);

/**
 * @swagger
 * /marts/{martId}/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: martId
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 */
router.delete("/:id", authenticateToken, deleteCategory);

export default router;
