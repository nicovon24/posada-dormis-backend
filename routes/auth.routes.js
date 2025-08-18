import express from "express";
import { loginLimiter } from "../middlewares/rateLimiter.js";
import {
	login,
	logout,
	refresh,
	register,
	verifyGet,
	verifyPost,
} from "../controllers/auth.controller.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { LOGIN_ATTEMPT, LOGOUT, USER_REGISTER } from "../constants/index.js";

const router = express.Router();

//login
router.post("/login", loginLimiter, auditLogger(LOGIN_ATTEMPT), login);

//refresh
router.post("/refresh", refresh);

//register
router.post("/register", auditLogger(USER_REGISTER), register);

// verify account
router.get("/verify", verifyGet);
router.post("/verify", verifyPost);

//logout
router.post("/logout", auditLogger(LOGOUT), logout);

export default router;
