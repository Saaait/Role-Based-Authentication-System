const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
    {
        username: String,
        email: String,
        password: String,
        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            select: false,
        },
        refreshTokens: [String],

        // Account lock fields 
        loginAttempts: { type: Number, default: 0 },
        isLocked: { type: Boolean, default: false },
        lockUntil: { type: Date, default: null },

        // Password reset fields
        resetPasswordToken: String,
        resetPasswordExpire: Date,

        // 2FA fields
        twoFactorEnabled: { type: Boolean, default: false },
        twoFactorSecret: { type: String, select: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
