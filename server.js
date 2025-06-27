const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const BalanceItem = require('./models/BalanceItem');
const Category = require('./models/Category');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || '*',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('✅ Connected to MongoDB');
    initializeDefaultCategories();
})
.catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
});

// JWT Helper Functions
function generateToken(userId) {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Authentication middleware
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token tidak valid' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ success: false, message: 'Token tidak valid' });
        }

        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User tidak ditemukan' });
        }

        req.userId = decoded.userId;
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Token tidak valid' });
    }
}

// Initialize default categories for new users
async function initializeDefaultCategories() {
    // This will be called when users register
}

async function createDefaultCategories(userId) {
    const defaultIncomeCategories = ['Penjualan', 'Jasa', 'Komisi', 'Lainnya'];
    const defaultExpenseCategories = ['Supplier Cost', 'Transport', 'Office Expense', 'Other'];

    try {
        // Create income categories
        for (const name of defaultIncomeCategories) {
            await Category.create({
                userId,
                type: 'income',
                name,
                isDefault: true
            });
        }

        // Create expense categories
        for (const name of defaultExpenseCategories) {
            await Category.create({
                userId,
                type: 'expense',
                name,
                isDefault: true
            });
        }
    } catch (error) {
        console.error('Error creating default categories:', error);
    }
}

// Routes

// Test route
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Backend Afams Mini Accounting Berjalan ✅',
        version: '2.0.0',
        database: 'MongoDB'
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
});

// Register endpoint
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email dan password harus diisi' 
            });
        }

        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password minimal 4 karakter' 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email sudah terdaftar' 
            });
        }

        // Create new user
        const user = new User({
            email: email.toLowerCase(),
            password
        });

        await user.save();

        // Create default categories for the new user
        await createDefaultCategories(user._id);

        res.status(201).json({ 
            success: true, 
            message: 'Pendaftaran berhasil. Silakan login.' 
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Login endpoint
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email dan password harus diisi' 
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email atau password salah' 
            });
        }

        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false, 
                message: 'Email atau password salah' 
            });
        }

        // Generate token
        const token = generateToken(user._id);
        
        res.json({ 
            success: true, 
            message: 'Login berhasil',
            token,
            user: { 
                id: user._id, 
                email: user.email 
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Dashboard endpoint (protected)
app.get('/dashboard', authenticate, async (req, res) => {
    try {
        const userId = req.userId;

        // Get summary data
        const transactions = await Transaction.find({ userId });
        const balanceItems = await BalanceItem.find({ userId });

        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const profit = totalIncome - totalExpense;

        const totalAssets = balanceItems
            .filter(b => b.type === 'asset')
            .reduce((sum, b) => sum + b.amount, 0);

        const totalLiabilities = balanceItems
            .filter(b => b.type === 'liability')
            .reduce((sum, b) => sum + b.amount, 0);

        const totalEquity = balanceItems
            .filter(b => b.type === 'equity')
            .reduce((sum, b) => sum + b.amount, 0);

        res.json({ 
            success: true, 
            message: 'Dashboard data berhasil diambil',
            data: {
                userId,
                summary: {
                    totalIncome,
                    totalExpense,
                    profit,
                    totalAssets,
                    totalLiabilities,
                    totalEquity
                },
                transactionCount: transactions.length,
                balanceItemCount: balanceItems.length
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Get all transactions for user
app.get('/transactions', authenticate, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.userId })
            .sort({ date: -1, createdAt: -1 });

        res.json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Add new transaction
app.post('/transactions', authenticate, async (req, res) => {
    try {
        const transactionData = {
            ...req.body,
            userId: req.userId
        };

        const transaction = new Transaction(transactionData);
        await transaction.save();

        res.status(201).json({
            success: true,
            message: 'Transaksi berhasil ditambahkan',
            data: transaction
        });
    } catch (error) {
        console.error('Add transaction error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Update transaction
app.put('/transactions/:id', authenticate, async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { ...req.body, updatedAt: Date.now() },
            { new: true }
        );

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Transaksi berhasil diupdate',
            data: transaction
        });
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Delete transaction
app.delete('/transactions/:id', authenticate, async (req, res) => {
    try {
        const transaction = await Transaction.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: 'Transaksi tidak ditemukan'
            });
        }

        res.json({
            success: true,
            message: 'Transaksi berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Balance Items endpoints
app.get('/balance-items', authenticate, async (req, res) => {
    try {
        const balanceItems = await BalanceItem.find({ userId: req.userId })
            .sort({ date: -1, createdAt: -1 });

        res.json({
            success: true,
            data: balanceItems
        });
    } catch (error) {
        console.error('Get balance items error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

app.post('/balance-items', authenticate, async (req, res) => {
    try {
        const balanceItemData = {
            ...req.body,
            userId: req.userId
        };

        const balanceItem = new BalanceItem(balanceItemData);
        await balanceItem.save();

        res.status(201).json({
            success: true,
            message: 'Item neraca berhasil ditambahkan',
            data: balanceItem
        });
    } catch (error) {
        console.error('Add balance item error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Categories endpoints
app.get('/categories', authenticate, async (req, res) => {
    try {
        const categories = await Category.find({ userId: req.userId })
            .sort({ type: 1, name: 1 });

        const incomeCategories = categories
            .filter(c => c.type === 'income')
            .map(c => c.name);

        const expenseCategories = categories
            .filter(c => c.type === 'expense')
            .map(c => c.name);

        res.json({
            success: true,
            data: {
                income: incomeCategories,
                expense: expenseCategories
            }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

app.post('/categories', authenticate, async (req, res) => {
    try {
        const { type, name } = req.body;

        if (!type || !name) {
            return res.status(400).json({
                success: false,
                message: 'Type dan name harus diisi'
            });
        }

        // Check if category already exists
        const existingCategory = await Category.findOne({
            userId: req.userId,
            type,
            name
        });

        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: 'Kategori sudah ada'
            });
        }

        const category = new Category({
            userId: req.userId,
            type,
            name,
            isDefault: false
        });

        await category.save();

        res.status(201).json({
            success: true,
            message: 'Kategori berhasil ditambahkan',
            data: category
        });
    } catch (error) {
        console.error('Add category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Delete category
app.delete('/categories/:id', authenticate, async (req, res) => {
    try {
        const category = await Category.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
            isDefault: false // Can't delete default categories
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Kategori tidak ditemukan atau tidak dapat dihapus'
            });
        }

        res.json({
            success: true,
            message: 'Kategori berhasil dihapus'
        });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Terjadi kesalahan pada server' 
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan pada server'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
});


