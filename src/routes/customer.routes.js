import express from "express";
import { getCustomers } from "../controllers/customer.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Customer:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the customer
 *         name:
 *           type: string
 *           description: The customer's full name
 *         email:
 *           type: string
 *           description: The customer's email address
 *         phone:
 *           type: string
 *           description: The customer's phone number
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
 *         loyaltyPoints:
 *           type: number
 *           description: Customer's loyalty points balance
 *         totalPurchases:
 *           type: number
 *           description: Total amount of purchases made
 *         lastPurchase:
 *           type: string
 *           format: date-time
 *           description: Date of last purchase
 *         isActive:
 *           type: boolean
 *           description: Whether the customer is active
 *         mart:
 *           type: string
 *           description: The mart ID this customer belongs to
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the customer was created
 *       example:
 *         id: 64f5e8b5c5d4e2f1a8b9c0d6
 *         name: John Smith
 *         email: john.smith@email.com
 *         phone: +1-555-0123
 *         address:
 *           street: 456 Oak Ave
 *           city: New York
 *           state: NY
 *           zipCode: "10002"
 *           country: USA
 *         loyaltyPoints: 250
 *         totalPurchases: 1250.75
 *         lastPurchase: 2023-09-01T10:30:00.000Z
 *         isActive: true
 *         mart: 64f5e8b5c5d4e2f1a8b9c0d2
 *         createdAt: 2023-08-15T08:00:00.000Z
 */

/**
 * @swagger
 * /marts/{martId}/customers:
 *   get:
 *     summary: Get all customers for a specific mart
 *     tags: [Customers]
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
 *         description: Search term for customer name, email, or phone
 *       - in: query
 *         name: loyaltyTier
 *         schema:
 *           type: string
 *           enum: [bronze, silver, gold, platinum]
 *         description: Filter by loyalty tier
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, email, totalPurchases, loyaltyPoints, lastPurchase, createdAt]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
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
 *                   example: Customers retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     customers:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Customer'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCustomers:
 *                           type: number
 *                           example: 1250
 *                         activeCustomers:
 *                           type: number
 *                           example: 1100
 *                         newThisMonth:
 *                           type: number
 *                           example: 45
 *                         totalLoyaltyPoints:
 *                           type: number
 *                           example: 125000
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
 *                       example: 1250
 *                     pages:
 *                       type: integer
 *                       example: 125
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
router.get("/", authenticateToken, getCustomers);

export default router;
