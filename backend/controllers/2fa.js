const asyncHandler = require("express-async-handler");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// @route   POST /api/users/enable-2fa
// @desc    Enable 2FA for logged-in user
// @access  Private
const enable2FA = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a secret
    const secret = speakeasy.generateSecret({ name: `RBAC-${user.email}` });

    // Save secret temporarily
    user.twoFactorSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
        message: "Scan this QR code in your authenticator app",
        qrCodeUrl,
        secret: secret.base32 // optional for manual entry
    });
});

// @route   POST /api/users/verify-2fa
// @desc    Verify 2FA token and activate 2FA
// @access  Private
const verify2FA = asyncHandler(async (req, res) => {
    const { token } = req.body;

    // Find the user by ID and include the twoFactorSecret field
    const user = await User.findById(req.user.id).select("+twoFactorSecret");

    if (!user || !user.twoFactorSecret)
        return res.status(400).json({ message: "2FA not initialized" });

    // Verify the provided TOTP token with the user's 2FA secret
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 2, // Allow tokens within a 2-step window (~150s)
    });
    r
    if (!verified)
        return res.status(400).json({ message: "Invalid 2FA token" });

    // Enable 2FA for the user and save
    user.twoFactorEnabled = true;
    await user.save();

    // Return success response
    res.json({ message: "2FA enabled successfully" });
});

// @route   POST /api/users/login-2fa
// @desc    Login with 2FA token after normal login
// @access  Public
const login2FA = asyncHandler(async (req, res) => {
    const { userId, token } = req.body;

    // Find user by ID and include sensitive fields for verification
    const user = await User.findById(userId).select("+twoFactorSecret +role +refreshTokens");

    if (!user || !user.twoFactorSecret)
        return res.status(400).json({ message: "Invalid request" });

    // Verify the provided TOTP token
    const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token,
        window: 1, // Allow tokens within 1-step window (~90s)
    });

    if (!verified) return res.status(400).json({ message: "Invalid 2FA token" });

    // Generate access token with user details and short expiration
    const accessToken = jwt.sign(
        { user: { username: user.username, email: user.email, id: user.id, role: user.role } },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30m" }
    );

    // Generate refresh token with longer expiration
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    // Store refresh token in the user's record and maintain max 5 tokens
    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();

    // Return successful login response with tokens
    res.json({
        message: "Login successful",
        accessToken,
        refreshToken
    });
});


module.exports = {
    enable2FA,
    verify2FA,
    login2FA,
};