import express from "express";
import { getReports } from "../controllers/report.controller.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

/**
 * @swagger
 * components:
 *   schemas:
 *     SalesReport:
 *       type: object
 *       properties:
 *         period:
 *           type: string
 *           description: Report period
 *         totalSales:
 *           type: number
 *           description: Total sales amount
 *         totalOrders:
 *           type: number
 *           description: Total number of orders
 *         averageOrderValue:
 *           type: number
 *           description: Average order value
 *         topProducts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *               quantity:
 *                 type: number
 *               revenue:
 *                 type: number
 *         salesByDay:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               sales:
 *                 type: number
 *               orders:
 *                 type: number
 *       example:
 *         period: "2023-09-01 to 2023-09-30"
 *         totalSales: 125000.75
 *         totalOrders: 2500
 *         averageOrderValue: 50.00
 *         topProducts:
 *           - product: "Organic Apples"
 *             quantity: 500
 *             revenue: 2500.00
 *         salesByDay:
 *           - date: "2023-09-01"
 *             sales: 4200.50
 *             orders: 85
 *
 *     InventoryReport:
 *       type: object
 *       properties:
 *         totalProducts:
 *           type: number
 *           description: Total number of products
 *         lowStockItems:
 *           type: number
 *           description: Items below minimum stock
 *         outOfStockItems:
 *           type: number
 *           description: Items that are out of stock
 *         totalInventoryValue:
 *           type: number
 *           description: Total value of inventory
 *         topSellingProducts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *               quantitySold:
 *                 type: number
 *               currentStock:
 *                 type: number
 *         slowMovingProducts:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *               daysSinceLastSale:
 *                 type: number
 *               currentStock:
 *                 type: number
 *       example:
 *         totalProducts: 150
 *         lowStockItems: 12
 *         outOfStockItems: 3
 *         totalInventoryValue: 75000.00
 *         topSellingProducts:
 *           - product: "Organic Apples"
 *             quantitySold: 500
 *             currentStock: 85
 *         slowMovingProducts:
 *           - product: "Specialty Tea"
 *             daysSinceLastSale: 45
 *             currentStock: 20
 */

/**
 * @swagger
 * /marts/{martId}/reports:
 *   get:
 *     summary: Get comprehensive reports and analytics for a mart
 *     tags: [Reports]
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
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sales, inventory, customer, financial, product-performance]
 *         description: Type of report to generate
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [today, week, month, quarter, year, custom]
 *           default: month
 *         description: Time period for the report
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for custom period (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for custom period (YYYY-MM-DD)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by product category ID (for product reports)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv, pdf]
 *           default: json
 *         description: Report output format
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, category, product]
 *         description: Group results by specified field
 *     responses:
 *       200:
 *         description: Report generated successfully
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
 *                   example: Sales report generated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     reportType:
 *                       type: string
 *                       example: sales
 *                     period:
 *                       type: string
 *                       example: "2023-09-01 to 2023-09-30"
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-01T09:00:00.000Z"
 *                     summary:
 *                       type: object
 *                       description: High-level summary metrics
 *                     details:
 *                       type: object
 *                       description: Detailed report data (varies by report type)
 *                     charts:
 *                       type: object
 *                       description: Chart data for visualization
 *                       properties:
 *                         salesTrend:
 *                           type: array
 *                           items:
 *                             type: object
 *                         categoryBreakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *           text/csv:
 *             schema:
 *               type: string
 *               description: CSV formatted report data
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *               description: PDF formatted report
 *       400:
 *         description: Invalid report parameters
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
router.get("/", authenticateToken, getReports);

export default router;
