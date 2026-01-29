const express = require("express");

// Controllers 
// User Controllers
const {
    registerUser,
    loginUser,
    currentUser,
    getAllUsers,
    updateUser,
    deleteUser,
    logoutUser,
} = require("../controllers/userController");

// 2FA Controllers
const {
    enable2FA,
    verify2FA,
    login2FA,
} = require("../controllers/2fa");

// Password Reset Controllers
const {
    forgotPassword,
    resetPassword,
} = require("../controllers/passwordReset");

// Refresh Token Controller
const {
    refreshTokenHandler,
} = require("../controllers/refreshToken");

// Middleware
const validateToken = require("../middleware/validateTokenHandler");

// 
const { loginLimiter,
    forgotPasswordLimiter
} = require("../middleware/rateLimiter");

// Router
const router = express.Router();

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/refresh", refreshTokenHandler);
router.post("/logout", logoutUser);

// 2FA Routes
router.post("/enable-2fa", validateToken, enable2FA);
router.post("/verify-2fa", validateToken, verify2FA);
router.post("/login-2fa", login2FA);

// password reset
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Private Routes
router.get("/current", validateToken, currentUser);

// Admin + User Routes
router.get("/", validateToken, getAllUsers);
router.put("/:id", validateToken, updateUser);
router.delete("/:id", validateToken, deleteUser);

module.exports = router;
