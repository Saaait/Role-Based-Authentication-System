const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");
const connectDb = require("./config/dbConnection");
const dotenv = require("dotenv").config();
const seedAdmin = require("./seedAdmin");


const { globalLimiter } = require("./middleware/rateLimiter");

// Global limiter (optional)
app.use(globalLimiter);


connectDb().then(async () => {
    const app = express();

    const port = process.env.PORT || 5000;

    // ✅ Enable CORS
    app.use(cors({
        origin: "http://localhost:5173", // frontend URL
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }));

    // Parse JSON body
    app.use(express.json());

    // ----------------- Routes -----------------

    // Users
    app.use("/api/users", require("./routes/userRoutes"));

    // Seed admin user after DB connection
    await seedAdmin();

    // Start server
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});
