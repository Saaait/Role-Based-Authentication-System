const crypto = require("crypto");
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");


// PASSWORD RESET UTILITIES

// create a transporter using Mailtrap env
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 2525,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

// FORGOT PASSWORD
// POST /api/users/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No user with that email" });

    // Generate a token (plain) and a hashed token to store in DB
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set token and expiry in DB (10 minutes)
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Build reset URL that user will click (frontend route)
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Send email via Mailtrap (token show for development testing)
    const transporter = createTransporter();
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset Password Link: ${resetURL}\nToken: ${resetToken}`,
        html: `
        <p>Hi ${user.username || "User"},</p>
        <p>You requested a password reset. Click the link below to set a new password. This link is valid for 10 minutes.</p>
        <p><a href="${resetURL}">Reset your password</a></p>
        <p><strong>Token:</strong> ${resetToken}</p> 
        <p>If you didn't request this, ignore this email.</p>
      `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        // In Mailtrap you'll see the message in the inbox; we also return a short success
        return res.json({ message: "Reset email sent (check Mailtrap inbox in dev)" });
    } catch (err) {
        // cleanup tokens on error
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        console.error("Email send error:", err);
        return res.status(500).json({ message: "Could not send reset email" });
    }
});

// RESET PASSWORD
// POST /api/users/reset-password/:token
const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) return res.status(400).json({ message: "Password is required" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
        return res.status(400).json({ message: "Token is invalid or has expired" });
    }

    // Hash new password and clear reset token fields
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    // Also reset loginAttempts and isLocked (nice to auto-unlock)
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;

    await user.save();

    return res.json({ message: "Password updated successfully" });
});

module.exports = {
    forgotPassword,
    resetPassword,
};