import express from "express";
import { loginLimiter } from "../middlewares/rateLimiter.js";
import {
	login,
	logout,
	refresh,
	register,
} from "../controllers/auth.controller.js";
import { auditLogger } from "../middlewares/auditLogger.js";
import { LOGIN_ATTEMPT, LOGOUT, USER_REGISTER } from "../constants/index.js";

const router = express.Router();

//login
router.post("/login", loginLimiter, auditLogger(LOGIN_ATTEMPT), login);

//refresh
router.post("/refresh", refresh);

//logout
router.post("/logout", auditLogger(LOGOUT), logout);

//register
router.post("/register", auditLogger(USER_REGISTER), register);

export default router;
