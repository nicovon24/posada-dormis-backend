// swagger.js
import swaggerAutogen from "swagger-autogen";

const outputFile = "./swagger.json";
const endpointFiles = ["./index.js"]; // tu punto de entrada donde haces router.use()

const doc = {
	info: {
		title: "Dormis API",
		description: "API documentation for Dormis application",
		version: "1.0.0",
	},

	// Este será el host y el esquema que Swagger UI usará como base:
	host: "localhost:4000",
	schemes: ["http"],
};

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointFiles, doc);
