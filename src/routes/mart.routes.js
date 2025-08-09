import express from "express";
import {
  createMart,
  getMarts,
  getMartById,
  updateMart,
  deleteMart,
} from "../controllers/mart.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Mart:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the mart
 *         name:
 *           type: string
 *           description: The mart's name
 *         description:
 *           type: string
 *           description: The mart's description
 *         address:
 *           type: object
 *           properties:
 *             street:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             zipCode:
 *               type: string
 *             country:
 *               type: string
 *         phone:
 *           type: string
 *           description: The mart's phone number
 *         email:
 *           type: string
 *           description: The mart's email address
 *         owner:
 *           type: string
 *           description: The user ID of the mart owner
 *         isActive:
 *           type: boolean
 *           description: Whether the mart is active
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the mart was created
 *       example:
 *         id: 64f5e8b5c5d4e2f1a8b9c0d2
 *         name: SuperMart Downtown
 *         description: A comprehensive grocery store in downtown area
 *         address:
 *           street: 123 Main St
 *           city: New York
 *           state: NY
 *           zipCode: "10001"
 *           country: USA
 *         phone: +1-555-0123
 *         email: info@supermart.com
 *         owner: 64f5e8b5c5d4e2f1a8b9c0d1
 *         isActive: true
 *         createdAt: 2023-09-04T12:00:00.000Z
 *
 *     MartRequest:
 *       type: object
 *       required:
 *         - name
 *         - address
 *       properties:
 *         name:
 *           type: string
 *           example: SuperMart Downtown
 *         description:
 *           type: string
 *           example: A comprehensive grocery store in downtown area
 *         address:
 *           type: object
 *           required:
 *             - street
 *             - city
 *             - state
 *             - zipCode
 *             - country
 *           properties:
 *             street:
 *               type: string
 *               example: 123 Main St
 *             city:
 *               type: string
 *               example: New York
 *             state:
 *               type: string
 *               example: NY
 *             zipCode:
 *               type: string
 *               example: "10001"
 *             country:
 *               type: string
 *               example: USA
 *         phone:
 *           type: string
 *           example: +1-555-0123
 *         email:
 *           type: string
 *           example: info@supermart.com
 */

/**
 * @swagger
 * /marts:
 *   post:
 *     summary: Create a new mart
 *     tags: [Marts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MartRequest'
 *     responses:
 *       201:
 *         description: Mart created successfully
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
 *                   example: Mart created successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mart'
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/", authenticateToken, createMart);

/**
 * @swagger
 * /marts:
 *   get:
 *     summary: Get all marts for the authenticated user
 *     tags: [Marts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for mart name or description
 *     responses:
 *       200:
 *         description: Marts retrieved successfully
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
 *                   example: Marts retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Mart'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authenticateToken, getMarts);

/**
 * @swagger
 * /marts/{id}:
 *   get:
 *     summary: Get a mart by ID
 *     tags: [Marts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *     responses:
 *       200:
 *         description: Mart retrieved successfully
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
 *                   example: Mart retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mart'
 *                 timestamp:
 *                   type: string
 *                   format: date-time
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authenticateToken, getMartById);

/**
 * @swagger
 * /marts/{id}:
 *   put:
 *     summary: Update a mart
 *     tags: [Marts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MartRequest'
 *     responses:
 *       200:
 *         description: Mart updated successfully
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
 *                   example: Mart updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/Mart'
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", authenticateToken, updateMart);

/**
 * @swagger
 * /marts/{id}:
 *   delete:
 *     summary: Delete a mart
 *     tags: [Marts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The mart ID
 *     responses:
 *       200:
 *         description: Mart deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", authenticateToken, deleteMart);

export default router;
