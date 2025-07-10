import rateLimit from "express-rate-limit";

// 🔐 Limit login attempts: max 5 per minute per IP
export const loginLimiter = rateLimit({
	windowMs: 1 * 60 * 1000, // ⏰ 1 minute time window
	max: 5, // ❌ Allow only 5 requests per IP in that window
	message: {
		error: "Too many login attempts. Please try again in 1 minute.",
	},
	standardHeaders: true, // ✅ Adds RateLimit headers
	legacyHeaders: false, // ❌ Disable old-style headers
});
