import express from "express";
const router = express.Router();

router.get("/hello", async (req, res) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Hello Beanery!!!",
    });
  } catch (error) {
    console.error("Error in getHello:", error);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

router.get("/health", async (req, res) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Service is healthy",
    });
  } catch (error) {
    console.error("Error in health check:", error);
    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
    });
  }
});

export default router;
