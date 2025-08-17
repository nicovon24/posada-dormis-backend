// src/models/tipoHabitacion.js
import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const TipoHabitacion = sequelize.define(
	"TipoHabitacion",
	{
		idTipoHabitacion: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		nombre: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		precio: {
			type: DataTypes.FLOAT,
			allowNull: false,
		},
	},
	{
		tableName: "TipoHabitacion",
		timestamps: false,
	}
);
