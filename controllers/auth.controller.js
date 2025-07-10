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
		if (!user) return res.status(401).json({ error: "Invalid credentials" });

		const isMatch = await bcrypt.compare(clave, user.clave);
		if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

		const { accessToken, refreshToken } = generateTokens(user.idUsuario);

		res.cookie("refreshToken", refreshToken, {
			httpOnly: true, //only accesislbe by web server
			secure: false, //https
			sameSite: "lax", //cross-site cookie
			maxAge: 7 * 24 * 60 * 60 * 1000, //in 7 days expire
		});

		res.json({ accessToken });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Internal server error" });
	}
}

export function refresh(req, res) {
	const token = req.cookies.refreshToken;
	if (!token) return res.status(401).json({ error: "Missing token" });

	try {
		const payload = jwt.verify(token, REFRESH_SECRET);
		const accessToken = jwt.sign({ userId: payload.userId }, ACCESS_SECRET, {
			expiresIn: EXP_ACCESS,
		});
		res.json({ accessToken });
	} catch (err) {
		res.status(403).json({ error: "Invalid token" });
	}
}

export function logout(_req, res) {
	res.clearCookie("refreshToken", {
		httpOnly: true,
		sameSite: "lax",
		secure: false,
	});
	res.json({ message: "Logged out" });
}

export async function register(req, res) {
	const { nombre, email, clave, tipoUsuario } = req.body;

	if (!nombre || !email || !clave || !tipoUsuario) {
		return res.status(400).json({ error: "Missing fields" });
	}

	try {
		const existing = await Usuario.findOne({ where: { email } });
		if (existing) {
			return res.status(409).json({ error: "Email already in use" });
		}

		const tipo = await TipoUsuario.findOne({ where: { nombre: tipoUsuario } });
		if (!tipo) {
			return res.status(404).json({ error: "User type not found" });
		}

		const hashed = await bcrypt.hash(clave, 10);

		const user = await Usuario.create({
			nombre,
			email,
			clave: hashed,
			idTypeUser: tipo.idTypeUser, // relación
		});

		res.status(201).json({
			message: "User created successfully",
			user: {
				id: user.idUsuario,
				nombre: user.nombre,
				email: user.email,
				type: tipo.nombre,
			},
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: "Error registering user" });
	}
}
