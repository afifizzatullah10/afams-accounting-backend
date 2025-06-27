const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['income', 'expense'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Ensure unique category names per user and type
categorySchema.index({ userId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);