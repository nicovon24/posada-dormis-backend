import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET_ACCESS;

export function verifyJWT(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Falta el token de acceso" });
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, ACCESS_SECRET);
		req.user = decoded; // make userId available in the route

		next();
	} catch (err) {
		console.error("Token verification failed:", err);
		return res.status(403).json({ error: "Invalid or expired token" });
	}
}
