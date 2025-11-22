const crypto = require("crypto");
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

// Register a User
//@route POST /api/users/register
//@access public
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const userAvailable = await User.findOne({ email });
    if (userAvailable) {
        return res.status(400).json({ message: "User exist" });
    }

    //Hash password 
    const hashedPassword = await bcrypt.hash(password, 10);
    // see on console
    console.log("Hashed Password: ", hashedPassword);

    const user = await User.create({
        username,
        email,
        password: hashedPassword,
        role: "user", // default role
    });

    // see on console
    console.log(`User created ${user}`);
    if (user) {
        return res.status(201).json({ message: "Registered successful", _id: user.id, email: user.email });
    } else {
        return res.status(400).json({ message: "User data not valid" });
    }
});

// Login a User
//@route POST /api/users/login
//@access public
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const user = await User.findOne({ email }).select("+role +password +loginAttempts +isLocked +lockUntil +refreshTokens +twoFactorEnabled +twoFactorSecret");

    if (!user) {
        return res.status(401).json({ message: "Email or Password is not valid" });
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil > Date.now()) {
        const remaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
        return res.status(403).json({ message: `Account is locked. Try again in ${remaining} minutes.` });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        user.loginAttempts += 1;

        // Lock account if max attempts exceeded
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
            user.isLocked = true;
            user.lockUntil = Date.now() + LOCK_TIME;
        }

        await user.save();
        return res.status(401).json({ message: "Email or Password is not valid" });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
        // Don't return accessToken yet, require OTP
        return res.json({ message: "2FA_REQUIRED", userId: user.id });
    }

    // Normal login flow
    const accessToken = jwt.sign(
        { user: { username: user.username, email: user.email, id: user.id, role: user.role } },
        process.env.ACCESS_TOKEN_SECERT,
        { expiresIn: "30m" }
    );

    // Create refresh token
    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
    );

    // Save refresh token in DB
    user.refreshTokens.push(refreshToken);

    // Keep max 5 tokens
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();

    await user.save();

    return res.status(200).json({
        message: "Login successful",
        accessToken,
        refreshToken,
    });
});



// Current User
//@route GET /api/users/current
//@access private
const currentUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("+role -password");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
    });
});

// Get All Users
//@route GET /api/users
//@access private (Admin only)
const getAllUsers = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }
    const users = await User.find().select("-password +role");
    res.status(200).json(users);
});

// Update a User
//@route PUT /api/users/:id
//@access private (Admin or user themselves)
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Find target user including role
    const user = await User.findById(id).select("+role");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // Fetch requester to verify permissions
    const requester = await User.findById(req.user.id).select("+role");
    if (!requester) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    // Allow update if admin or same user
    if (requester.role !== "admin" && requester.id !== id) {
        return res.status(403).json({ message: "Access denied: You can only update your own account" });
    }

    const { username, email, password, role } = req.body;
    let updatedFields = {};

    if (username) updatedFields.username = username;
    if (email) updatedFields.email = email;
    if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updatedFields.password = hashedPassword;
    }

    // Only admin can change roles
    if (requester.role === "admin" && role) {
        updatedFields.role = role;
    }

    // Update user and include role in response
    const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updatedFields },
        { new: true }
    ).select("-password +role");

    res.status(200).json(updatedUser);
});

// Delete a User
//@route DELETE /api/users/:id
//@access private (Admin only)
const deleteUser = asyncHandler(async (req, res) => {
    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied: Admins only" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: `User ${user.username} deleted successfully` });
});


// Logout User
//@route POST /api/users/logout
//@access public
const logoutUser = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ message: "Refresh token required" });
    }

    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
            if (err) {
                return res.status(200).json({ message: "Already logged out" });
            }

            const user = await User.findById(decoded.id);

            // Removes only specific device token
            if (user) {
                user.refreshTokens = user.refreshTokens.filter(
                    token => token !== refreshToken
                );
                await user.save();
            }

            return res.json({ message: "Logged out successfully" });
        }
    );
});


module.exports = {
    registerUser,
    loginUser,
    currentUser,
    getAllUsers,
    updateUser,
    deleteUser,
    logoutUser,
};
