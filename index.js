// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import { sequelize } from "./db.js";
import routes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();

// si vas a setear cookies secure:true detrás de proxy (Render), habilitá esto
app.set("trust proxy", 1);

// Resolver __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer y parsear manualmente swagger.json
const swaggerRaw = await fs.readFile(
	path.join(__dirname, "swagger.json"),
	"utf-8"
);
const swaggerDoc = JSON.parse(swaggerRaw);

// Solo en dev: Morgan + Swagger UI
if (process.env.NODE_ENV !== "production") {
	app.use(morgan("dev"));
	app.use(
		"/docs",
		swaggerUi.serve,
		swaggerUi.setup(swaggerDoc, { explorer: true })
	);
}

/* =========================
   CORS (whitelist + credentials)
   ========================= */
const whitelist = [
	process.env.CORS_ORIGIN, // ej: https://posada-dormis-frontend.vercel.app (setear en Render)
	"https://posada-dormis-frontend.vercel.app",
	"http://localhost:3000",
].filter(Boolean);

app.use(
	cors({
		origin(origin, callback) {
			// Permitir requests sin Origin (Postman/cURL) y los de la whitelist
			if (!origin || whitelist.includes(origin)) {
				return callback(null, true);
			}
			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true, // necesario para cookies
		methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
		allowedHeaders: ["Content-Type", "Authorization"],
		optionsSuccessStatus: 204,
	})
);

// Body & cookies
app.use(express.json());
app.use(cookieParser());

// Rutas
app.use("/api", routes);

// Healthcheck opcional
app.get("/health", (_req, res) => res.status(200).send("OK"));

const port = Number(process.env.PORT) || 4000;
sequelize
	.sync({ alter: true })
	.then(() => {
		console.log("✅ DB sincronizada");
		app.listen(port, () => {
			console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
			if (process.env.NODE_ENV !== "production") {
				console.log(`📚 Swagger UI en http://localhost:${port}/docs`);
			}
		});
	})
	.catch((err) => {
		console.error("❌ Error al conectar la DB:", err);
		process.exit(1);
	});
