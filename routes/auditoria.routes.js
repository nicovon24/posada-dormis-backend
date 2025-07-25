import express from "express";
import { getAllAuditorias } from "../controllers/auditoria.js";

const router = express.Router();

router.get("/", getAllAuditorias);

export default router;
