import express from "express";
import { getAllAuditorias } from "../controllers/Auditoria.js";

const router = express.Router();

router.get("/", getAllAuditorias);

export default router;
