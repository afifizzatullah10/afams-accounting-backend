# Afams Mini Accounting Backend

A comprehensive accounting API built with Node.js, Express, and MongoDB for managing personal and small business finances.

## Features

- **User Authentication**: Secure JWT-based authentication
- **Transaction Management**: Add, edit, delete income and expense transactions
- **Balance Sheet**: Manage assets, liabilities, and equity
- **Category Management**: Custom income and expense categories
- **Dashboard Analytics**: Real-time financial summaries
- **RESTful API**: Well-structured API endpoints

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: bcryptjs for password hashing
- **CORS**: Cross-Origin Resource Sharing enabled

## API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /dashboard` - Protected dashboard data

### Transactions
- `GET /transactions` - Get all user transactions
- `POST /transactions` - Create new transaction
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction

### Balance Sheet
- `GET /balance-items` - Get balance sheet items
- `POST /balance-items` - Add balance sheet item

### Categories
- `GET /categories` - Get user categories
- `POST /categories` - Add new category
- `DELETE /categories/:id` - Delete category

### Health Check
- `GET /` - API status
- `GET /health` - Detailed health check

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# CORS Configuration
FRONTEND_URL=*
```

## Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd afams-accounting-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment on Render

1. **Push to GitHub**
2. **Connect to Render**
3. **Set Environment Variables**:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string
   - `NODE_ENV`: production
   - `FRONTEND_URL`: Your frontend domain (or * for all)

4. **Deploy**: Render will automatically install dependencies and start the server

## Project Structure

```
afams-accounting-backend/
├── models/
│   ├── User.js
│   ├── Transaction.js
│   ├── BalanceItem.js
│   └── Category.js
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Data Models

### User
- email (unique)
- password (hashed)
- createdAt

### Transaction
- userId (reference to User)
- type (income/expense)
- date
- category
- description
- amount
- customerName (for income)
- invoiceNumber (optional)

### BalanceItem
- userId (reference to User)
- type (asset/liability/equity)
- date
- category
- description
- amount

### Category
- userId (reference to User)
- type (income/expense)
- name
- isDefault

## Security Features

- Password hashing with bcryptjs
- JWT token authentication
- User data isolation
- Input validation
- CORS protection
- Environment variable protection

## License

ISC License

## Author

Afams Team