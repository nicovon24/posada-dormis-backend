import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { sequelize } from "./db.js";
import routes from "./routes/index.js";

dotenv.config();
const app = express();

app.use(
	cors({
		origin: "http://localhost:3000",
		credentials: true,
	})
);
app.use(express.json());
app.use(cookieParser());
app.use("/api", routes);

sequelize
	.sync({ alter: true })
	.then(() => {
		console.log("✅ DB sincronizada");
		app.listen(4000, () => {
			console.log("🚀 Servidor corriendo en http://localhost:4000");
		});
	})
	.catch((err) => {
		console.error("❌ Error al conectar la DB:", err);
	});
