import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const Usuario = sequelize.define(
	"Usuario",
	{
		idUsuario: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		email: {
			type: DataTypes.STRING,
			allowNull: false,
			unique: true,
		},
		nombre: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		clave: {
			type: DataTypes.STRING,
			allowNull: false,
		},
	},
	{
		tableName: "Usuario",
		timestamps: false,
	}
);
