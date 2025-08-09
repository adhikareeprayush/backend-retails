import express from "express";
import { getInventory } from "../controllers/inventory.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     InventoryItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the inventory item
 *         product:
 *           type: string
 *           description: The product ID
 *         currentStock:
 *           type: number
 *           description: Current stock quantity
 *         minStock:
 *           type: number
 *           description: Minimum stock threshold
 *         maxStock:
 *           type: number
 *           description: Maximum stock capacity
 *         reservedStock:
 *           type: number
 *           description: Stock reserved for pending orders
 *         lastUpdated:
 *           type: string
 *           format: date-time
 *           description: Last stock update timestamp
 *         mart:
 *           type: string
 *           description: The mart ID this inventory belongs to
 *       example:
 *         id: 64f5e8b5c5d4e2f1a8b9c0d5
 *         product: 64f5e8b5c5d4e2f1a8b9c0d3
 *         currentStock: 85
 *         minStock: 10
 *         maxStock: 200
 *         reservedStock: 5
 *         lastUpdated: 2023-09-04T12:00:00.000Z
 *         mart: 64f5e8b5c5d4e2f1a8b9c0d2
 */

/**
 * @swagger
 * /marts/{martId}/inventory:
 *   get:
 *     summary: Get inventory status for all products in a mart
 *     tags: [Inventory]
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
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: Filter items with low stock (below minimum threshold)
 *       - in: query
 *         name: outOfStock
 *         schema:
 *           type: boolean
 *         description: Filter items that are out of stock
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category ID
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
 *     responses:
 *       200:
 *         description: Inventory retrieved successfully
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
 *                   example: Inventory retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/InventoryItem'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalProducts:
 *                           type: number
 *                           example: 150
 *                         lowStockItems:
 *                           type: number
 *                           example: 12
 *                         outOfStockItems:
 *                           type: number
 *                           example: 3
 *                         totalValue:
 *                           type: number
 *                           example: 25000.50
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
 *                       example: 150
 *                     pages:
 *                       type: integer
 *                       example: 15
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
router.get("/", authenticateToken, getInventory);

export default router;
