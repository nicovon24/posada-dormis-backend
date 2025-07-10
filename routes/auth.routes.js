import express from "express";
import { loginLimiter } from "../middlewares/rateLimiter.js";
import {
	login,
	logout,
	refresh,
	register,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/login", loginLimiter, login);

router.post("/refresh", refresh);

router.post("/logout", logout);

router.post("/register", register);

export default router;
