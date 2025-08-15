import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/usuario.js";
import { TipoUsuario } from "../models/index.js";

const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS;
const REFRESH_SECRET = process.env.JWT_SECRET_REFRESH;
const EXP_ACCESS = process.env.JWT_EXPIRATION_ACCESS || "15m";
const EXP_REFRESH = process.env.JWT_EXPIRATION_REFRESH || "1d";

const IS_PROD = process.env.NODE_ENV === "production";
const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/auth";

export function generateTokens(userId) {
	const accessToken = jwt.sign({ userId }, ACCESS_SECRET, {
		expiresIn: EXP_ACCESS,
	});
	const refreshToken = jwt.sign({ userId }, REFRESH_SECRET, {
		expiresIn: EXP_REFRESH,
	});
	return { accessToken, refreshToken };
}

export async function login(req, res) {
	const { email, clave } = req.body;
	try {
		const user = await Usuario.findOne({ where: { email } });
		if (!user) {
			return res.status(401).json({ message: "Credenciales inválidas" });
		}

		const isMatch = await bcrypt.compare(clave, user.clave);
		if (!isMatch) {
			return res.status(401).json({ message: "Credenciales inválidas" });
		}

		const { refreshToken } = generateTokens(user.idUsuario); // solo refresh

		// *** Cambio clave: SameSite=None en prod + secure; path consistente ***
		res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
			httpOnly: true,
			secure: IS_PROD, // requerido con SameSite=None
			sameSite: IS_PROD ? "None" : "Lax", // Lax en dev, None en prod
			path: REFRESH_COOKIE_PATH, // igual que en clearCookie
			maxAge: parseTimeToMs(EXP_REFRESH),
		});

		return res.status(200).json({ message: "Login exitoso" });
	} catch (err) {
		console.error("Error en login:", err);
		return res.status(500).json({ message: "Error interno del servidor" });
	}
}

export function refresh(req, res) {
	const token = req.cookies?.[REFRESH_COOKIE_NAME];
	if (!token) {
		// *** Cambio clave: mensaje exactamente como el que ves en prod ***
		return res.status(401).json({ error: "Falta el token de acceso" });
	}

	try {
		const payload = jwt.verify(token, REFRESH_SECRET);

		const accessToken = jwt.sign({ userId: payload.userId }, ACCESS_SECRET, {
			expiresIn: EXP_ACCESS,
		});

		return res.json({ accessToken });
	} catch (err) {
		console.error("Error en refresh token:", err);
		return res.status(403).json({ message: "Token inválido o expirado" });
	}
}

export function logout(req, res) {
	// *** Cambio clave: usar los mismos flags y path que al setearla ***
	res.clearCookie(REFRESH_COOKIE_NAME, {
		httpOnly: true,
		secure: IS_PROD,
		sameSite: IS_PROD ? "None" : "Lax",
		path: REFRESH_COOKIE_PATH,
	});
	return res.json({ message: "Cierre de sesión exitoso" });
}

export async function register(req, res) {
	const { nombre, email, clave, tipoUsuario } = req.body;
	if (!nombre || !email || !clave || !tipoUsuario) {
		return res.status(400).json({ message: "Faltan campos obligatorios" });
	}
	try {
		const existing = await Usuario.findOne({ where: { email } });
		if (existing) {
			return res.status(409).json({ message: "El correo ya está en uso" });
		}

		const tipo = await TipoUsuario.findOne({ where: { nombre: tipoUsuario } });
		if (!tipo) {
			return res.status(404).json({ message: "Tipo de usuario no encontrado" });
		}

		const hashed = await bcrypt.hash(clave, 10);
		const user = await Usuario.create({
			nombre,
			email,
			clave: hashed,
			idTipoUsuario: tipo.idTipoUsuario,
		});

		return res.status(201).json({
			message: "Usuario creado exitosamente",
			user: {
				id: user.idUsuario,
				nombre: user.nombre,
				email: user.email,
				tipo: tipo.nombre,
			},
		});
	} catch (err) {
		console.error("Error en registro:", err);
		return res
			.status(500)
			.json({ message: "Error interno al registrar usuario" });
	}
}

function parseTimeToMs(timeStr) {
	const match = String(timeStr).match(/^(\d+)([smhd])$/); // s|m|h|d
	if (!match) return null;
	const value = parseInt(match[1], 10);
	const unit = match[2];
	const multipliers = {
		s: 1000,
		m: 60 * 1000,
		h: 60 * 60 * 1000,
		d: 24 * 60 * 60 * 1000,
	};
	return value * multipliers[unit];
}
