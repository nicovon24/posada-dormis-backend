import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Usuario } from "../models/usuario.js";
import { TipoUsuario } from "../models/index.js";

const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS;
const REFRESH_SECRET = process.env.JWT_SECRET_REFRESH;
const EXP_ACCESS = process.env.JWT_EXPIRATION_ACCESS || "15m";
const EXP_REFRESH = process.env.JWT_EXPIRATION_REFRESH || "1d";

function generateTokens(userId) {
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

		const { accessToken, refreshToken } = generateTokens(user.idUsuario);
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 7 * 24 * 60 * 60 * 1000,
		});
		return res.json({ accessToken });
	} catch (err) {
		console.error("Error en login:", err);
		return res.status(500).json({ message: "Error interno del servidor" });
	}
}

export function refresh(req, res) {
	const token = req.cookies.refreshToken;
	if (!token) {
		return res.status(401).json({ message: "Token de refresco faltante" });
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

export function logout(_req, res) {
	res.clearCookie("refreshToken", {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
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
