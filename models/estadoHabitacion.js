import { DataTypes } from "sequelize";
import { sequelize } from "../db.js";

export const EstadoHabitacion = sequelize.define(
	"EstadoHabitacion",
	{
		idEstadoHabitacion: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true,
		},
		estado: {
			type: DataTypes.STRING,
			allowNull: false,
		},
	},
	{
		tableName: "EstadoHabitacion",
		timestamps: false,
	}
);
