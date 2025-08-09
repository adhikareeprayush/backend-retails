# Backend Mart API 🏪

A comprehensive, multi-tenant mart management system API built with Node.js, Express, and MongoDB. This backend provides a complete solution for managing retail operations including inventory, sales, customers, and reporting.

## 🚀 Features

### 🏬 Multi-Tenant Architecture

- **Mart Management**: Create and manage multiple retail locations
- **User Roles**: Admin and user role-based access control
- **Isolated Data**: Each mart's data is completely isolated

### 🛍️ Product & Inventory Management

- **Product Catalog**: Complete product management with categories
- **Inventory Tracking**: Real-time stock levels with low-stock alerts
- **Barcode Support**: SKU and barcode management
- **Category Organization**: Hierarchical product categorization

### 👥 Customer Management

- **Customer Profiles**: Detailed customer information
- **Loyalty Points**: Built-in loyalty program
- **Purchase History**: Track customer buying patterns
- **Address Management**: Multiple address support

### 💰 Sales & Billing

- **Transaction Processing**: Complete billing system
- **Payment Methods**: Support for cash, card, UPI, wallet
- **Tax Calculations**: Flexible tax configuration
- **Discounts**: Percentage and fixed amount discounts

### 📊 Analytics & Reporting

- **Sales Reports**: Detailed sales analytics
- **Inventory Reports**: Stock analysis and alerts
- **Customer Analytics**: Customer behavior insights
- **Financial Reports**: Revenue and profit tracking

### 🔐 Security & Authentication

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access**: Granular permission system
- **Rate Limiting**: API abuse protection
- **Data Validation**: Comprehensive input validation

### 📚 API Documentation

- **Swagger/OpenAPI**: Interactive API documentation
- **Comprehensive Schemas**: Detailed request/response models
- **Example Requests**: Ready-to-use API examples

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Documentation**: Swagger/OpenAPI
- **Logging**: Winston
- **File Upload**: Multer
- **Email**: Nodemailer
- **Security**: Helmet, CORS, Rate Limiting

## 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v18+ recommended)
- **MongoDB Atlas Account** or local MongoDB installation
- **Git** for version control
- **Email Service** (Gmail/SMTP) for notifications

## ⚡ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/adhikareeprayush/backend-mart.git
cd backend-mart
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```properties
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/backend-mart"

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key
JWT_REFRESH_EXPIRE=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 4. MongoDB Atlas Setup

1. Create a MongoDB Atlas account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Add your IP address to the whitelist (or use 0.0.0.0/0 for development)
4. Create a database user
5. Get your connection string and update `MONGODB_URI` in `.env`

### 5. Start the Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 6. Access the API

- **API Base URL**: `http://localhost:5000/api/v1`
- **API Documentation**: `http://localhost:5000/api/docs`
- **Health Check**: `http://localhost:5000/health`

## 📖 API Documentation

### Base URL

```
http://localhost:5000/api/v1
```

### Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### 🔐 Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user profile

#### 🏬 Mart Management

- `POST /marts` - Create a new mart
- `GET /marts` - Get all marts for user
- `GET /marts/:id` - Get mart by ID
- `PUT /marts/:id` - Update mart
- `DELETE /marts/:id` - Delete mart

#### 🛍️ Product Management

- `POST /marts/:martId/products` - Create product
- `GET /marts/:martId/products` - Get all products
- `GET /marts/:martId/products/:id` - Get product by ID
- `PUT /marts/:martId/products/:id` - Update product
- `DELETE /marts/:martId/products/:id` - Delete product

#### 📂 Category Management

- `POST /marts/:martId/categories` - Create category
- `GET /marts/:martId/categories` - Get all categories
- `GET /marts/:martId/categories/:id` - Get category by ID
- `PUT /marts/:martId/categories/:id` - Update category
- `DELETE /marts/:martId/categories/:id` - Delete category

#### 👥 Customer Management

- `GET /marts/:martId/customers` - Get all customers

#### 💰 Billing

- `GET /marts/:martId/bills` - Get all bills

#### 📦 Inventory

- `GET /marts/:martId/inventory` - Get inventory status

#### 📊 Reports

- `GET /marts/:martId/reports` - Generate reports

For detailed API documentation with request/response examples, visit: `http://localhost:5000/api/docs`

## 🏗️ Project Structure

```
backend-mart/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # MongoDB connection
│   │   └── swagger.js   # API documentation config
│   ├── controllers/     # Route controllers
│   │   ├── auth.controller.js
│   │   ├── mart.controller.js
│   │   ├── product.controller.js
│   │   ├── customer.controller.js
│   │   ├── bill.controller.js
│   │   └── ...
│   ├── middleware/      # Custom middleware
│   │   ├── auth.js      # Authentication middleware
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── models/          # Mongoose schemas
│   │   ├── User.js
│   │   ├── Mart.js
│   │   ├── Product.js
│   │   ├── Customer.js
│   │   └── ...
│   ├── routes/          # API routes
│   │   ├── auth.routes.js
│   │   ├── mart.routes.js
│   │   ├── product.routes.js
│   │   └── ...
│   ├── utils/           # Utility functions
│   │   ├── logger.js    # Winston logger
│   │   ├── responseUtils.js
│   │   └── emailService.js
│   └── validations/     # Joi validation schemas
├── logs/                # Application logs
├── uploads/             # File uploads directory
├── .env                 # Environment variables
├── .env.example         # Environment template
├── server.js            # Application entry point
└── package.json         # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

| Variable            | Description               | Default               |
| ------------------- | ------------------------- | --------------------- |
| `PORT`              | Server port               | 5000                  |
| `NODE_ENV`          | Environment               | development           |
| `MONGODB_URI`       | MongoDB connection string | Required              |
| `JWT_SECRET`        | JWT signing secret        | Required              |
| `JWT_EXPIRE`        | JWT expiration time       | 7d                    |
| `EMAIL_HOST`        | SMTP host                 | smtp.gmail.com        |
| `EMAIL_PORT`        | SMTP port                 | 587                   |
| `EMAIL_USER`        | Email username            | Required              |
| `EMAIL_PASS`        | Email password            | Required              |
| `CORS_ORIGIN`       | Allowed CORS origins      | http://localhost:3000 |
| `DEFAULT_PAGE_SIZE` | Default pagination size   | 20                    |
| `MAX_FILE_SIZE`     | Max upload file size      | 5242880 (5MB)         |

### MongoDB Setup

For MongoDB Atlas:

1. Create an account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Go to "Network Access" and add your IP (0.0.0.0/0 for development)
4. Go to "Database Access" and create a user
5. Get connection string from "Connect" → "Connect your application"

For local MongoDB:

```bash
# Install MongoDB locally
brew install mongodb/brew/mongodb-community  # macOS
# or follow installation guide for your OS

# Start MongoDB
brew services start mongodb/brew/mongodb-community
```

## 🧪 Testing

### Manual Testing

Use the interactive API documentation at `http://localhost:5000/api/docs` to test endpoints.

### Example Requests

#### Register a User

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123"
  }'
```

#### Create a Mart

```bash
curl -X POST http://localhost:5000/api/v1/marts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "SuperMart Downtown",
    "description": "A comprehensive grocery store",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "phone": "+1-555-0123",
    "email": "info@supermart.com"
  }'
```

## Troubleshooting

### Common Issues

#### MongoDB Connection Error

```
Error connecting to MongoDB: Could not connect to any servers
```

**Solution**: Check your MongoDB Atlas IP whitelist and connection string.

#### JWT Token Error

```
Invalid or expired token
```

**Solution**: Ensure you're sending the correct Bearer token in the Authorization header.

#### Port Already in Use

```
EADDRINUSE: address already in use :::5000
```

**Solution**: Kill the process or use a different port:

```bash
# Kill process on port 5000
npx kill-port 5000

# Or change PORT in .env file
PORT=3001
```

#### File Upload Issues

```
File too large
```

**Solution**: Check `MAX_FILE_SIZE` in environment variables and increase if needed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write clear commit messages
- Add tests for new features
- Update documentation for API changes
- Use conventional commit format

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Prayush Adhikari**

- GitHub: [@adhikareeprayush](https://github.com/adhikareeprayush)
- Email: adhikareeprayush@gmail.com

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/) - Fast, unopinionated web framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Mongoose](https://mongoosejs.com/) - MongoDB object modeling
- [Swagger](https://swagger.io/) - API documentation
- [Winston](https://github.com/winstonjs/winston) - Logging library

## 📈 Future Enhancements

- [ ] Real-time notifications with WebSockets
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support
- [ ] Integration with payment gateways
- [ ] Mobile app API optimization
- [ ] Automated testing suite
- [ ] Performance monitoring
- [ ] Caching with Redis
- [ ] Microservices architecture
- [ ] GraphQL API alternative

---

### 🚀 Quick Commands

```bash
# Start development server
npm run dev

# Start production server
npm start

For more information, visit the [API Documentation](http://localhost:5000/api/docs) when the server is running.
```
