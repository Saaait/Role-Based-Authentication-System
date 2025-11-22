const crypto = require("crypto");
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Refresh Token
//@route POST /api/users/refresh
//@access public
const refreshTokenHandler = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token required" });
    }

    // Verify refresh token
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if (err) {
                return res.status(403).json({ message: "Invalid refresh token" });
            }

            const user = await User.findById(decoded.id);

            if (!user || !user.refreshTokens.includes(refreshToken)) {
                return res.status(403).json({ message: "Refresh token no longer valid" });
            }

            // Generate new tokens
            const accessToken = jwt.sign(
                {
                    user: {
                        email: user.email,
                        username: user.username,
                        id: user.id,
                        role: user.role,
                    },
                },
                process.env.ACCESS_TOKEN_SECERT,
                { expiresIn: "30m" }
            );

            const newRefreshToken = jwt.sign(
                { id: user.id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: "7d" }
            );

            // CLEANUP & LIMIT TOKEN LIST

            // Remove expired/invalid tokens
            user.refreshTokens = user.refreshTokens.filter(token => {
                try {
                    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
                    return true;
                } catch (e) {
                    return false; // token is expired or invalid
                }
            });

            //  Remove the old refresh token being used
            user.refreshTokens = user.refreshTokens.filter(
                token => token !== refreshToken
            );

            // Add the new refresh token
            user.refreshTokens.push(newRefreshToken);

            // Limit storage to last 5 tokens
            if (user.refreshTokens.length > 5) {
                user.refreshTokens.shift(); // remove oldest
            }

            await user.save();

            return res.json({
                accessToken,
                refreshToken: newRefreshToken,
            });
        }
    );
});


module.exports = { refreshTokenHandler };