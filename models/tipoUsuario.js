import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const TipoUsuario = sequelize.define(
	"TipoUsuario",
	{
		idTipoUsuario: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		nombre: {
			type: DataTypes.STRING,
			allowNull: false,
		},
	},
	{
		tableName: "TipoUsuario",
		timestamps: false,
	}
);
