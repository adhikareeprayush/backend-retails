import express from "express";
import { getBills } from "../controllers/bill.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     Bill:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the bill
 *         billNumber:
 *           type: string
 *           description: Unique bill number
 *         customer:
 *           type: string
 *           description: Customer ID (optional for walk-in customers)
 *         items:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 description: Product ID
 *               quantity:
 *                 type: number
 *                 description: Quantity purchased
 *               unitPrice:
 *                 type: number
 *                 description: Price per unit at time of sale
 *               total:
 *                 type: number
 *                 description: Total for this line item
 *         subtotal:
 *           type: number
 *           description: Subtotal before taxes and discounts
 *         tax:
 *           type: object
 *           properties:
 *             rate:
 *               type: number
 *               description: Tax rate percentage
 *             amount:
 *               type: number
 *               description: Tax amount
 *         discount:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *               enum: [percentage, fixed]
 *             value:
 *               type: number
 *               description: Discount value
 *             amount:
 *               type: number
 *               description: Discount amount
 *         total:
 *           type: number
 *           description: Final total amount
 *         paymentMethod:
 *           type: string
 *           enum: [cash, card, upi, wallet]
 *           description: Payment method used
 *         status:
 *           type: string
 *           enum: [completed, pending, cancelled, refunded]
 *           description: Bill status
 *         createdBy:
 *           type: string
 *           description: User ID who created the bill
 *         mart:
 *           type: string
 *           description: The mart ID this bill belongs to
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the bill was created
 *       example:
 *         id: 64f5e8b5c5d4e2f1a8b9c0d7
 *         billNumber: BILL-2023-001234
 *         customer: 64f5e8b5c5d4e2f1a8b9c0d6
 *         items:
 *           - product: 64f5e8b5c5d4e2f1a8b9c0d3
 *             quantity: 2
 *             unitPrice: 4.99
 *             total: 9.98
 *           - product: 64f5e8b5c5d4e2f1a8b9c0d8
 *             quantity: 1
 *             unitPrice: 12.50
 *             total: 12.50
 *         subtotal: 22.48
 *         tax:
 *           rate: 8.5
 *           amount: 1.91
 *         discount:
 *           type: percentage
 *           value: 5
 *           amount: 1.12
 *         total: 23.27
 *         paymentMethod: card
 *         status: completed
 *         createdBy: 64f5e8b5c5d4e2f1a8b9c0d1
 *         mart: 64f5e8b5c5d4e2f1a8b9c0d2
 *         createdAt: 2023-09-04T14:30:00.000Z
 */

/**
 * @swagger
 * /marts/{martId}/bills:
 *   get:
 *     summary: Get all bills for a specific mart
 *     tags: [Bills]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, pending, cancelled, refunded]
 *         description: Filter by bill status
 *       - in: query
 *         name: paymentMethod
 *         schema:
 *           type: string
 *           enum: [cash, card, upi, wallet]
 *         description: Filter by payment method
 *       - in: query
 *         name: customer
 *         schema:
 *           type: string
 *         description: Filter by customer ID
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bills from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bills to this date (YYYY-MM-DD)
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: Filter bills with total >= this amount
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: Filter bills with total <= this amount
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [billNumber, total, createdAt, customer]
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
 *         description: Bills retrieved successfully
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
 *                   example: Bills retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     bills:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Bill'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalBills:
 *                           type: number
 *                           example: 2500
 *                         totalRevenue:
 *                           type: number
 *                           example: 125000.75
 *                         averageBillValue:
 *                           type: number
 *                           example: 50.00
 *                         todaysBills:
 *                           type: number
 *                           example: 45
 *                         todaysRevenue:
 *                           type: number
 *                           example: 2250.50
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
 *                       example: 2500
 *                     pages:
 *                       type: integer
 *                       example: 250
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
router.get("/", authenticateToken, getBills);

export default router;
