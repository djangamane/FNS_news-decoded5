const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const articleRoutes = require("./routes/articles");
const adminRoutes = require("./routes/admin");
const blogRoutes = require("./routes/blog");

const app = express();

// Security middleware
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/articles", articleRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/blog", blogRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Article Fetching Service API",
    version: "1.0.0",
    endpoints: {
      "GET /api/articles/fetch?url=<url>": "Fetch single article",
      "POST /api/articles/batch": "Fetch multiple articles",
      "GET /api/articles/health": "Health check",
      "POST /api/admin/trigger-fetch": "Manual article fetch (admin)",
      "GET /api/admin/status": "Admin status check",
    },
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    availableEndpoints: [
      "GET /",
      "GET /api/articles/fetch",
      "POST /api/articles/batch",
      "GET /api/articles/health",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Article Fetching Service running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
