const rateLimit = require("express-rate-limit");

//  Global rate limiter (optional)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutes
    max: 300,                   // 300 requests per IP per 15min
    standardHeaders: true,
    legacyHeaders: false,
});

// 🔐 Login-specific limiter (strong)
// Protects against brute force attacks
const loginLimiter = rateLimit({
    keyGenerator: (req, res) => req.body.email || req.ip,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5,                  // Only 5 attempts per 5 min
    message: {
        success: false,
        message: "Too many login attempts. Please try again in 5 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// 🔐 Forgot-password limiter (optional but recommended)
const forgotPasswordLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3,
    message: {
        success: false,
        message: "Too many password reset attempts. Try again later."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    globalLimiter,
    loginLimiter,
    forgotPasswordLimiter,
};
