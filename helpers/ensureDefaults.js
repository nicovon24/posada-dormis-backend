import { EstadoReserva } from "../models/estadoReserva.js";
import { TipoUsuario } from "../models/tipoUsuario.js";

const all = { create: true, read: true, update: true, delete: true };

const sysadminPerms = {
    usuario: all, tipoHabitacion: all, habitacion: all,
    reserva: all, huesped: all, estadoReserva: all, auditoria: all,
};

const adminPerms = {
    usuario: { create: false, read: true, update: false, delete: false },
    tipoHabitacion: all,
    habitacion: all,
    reserva: all,
    huesped: all,
    estadoReserva: all,
    auditoria: { create: false, read: true, update: false, delete: false },
};

export async function ensureDefaultRoles() {
    const defaults = [
        {
            nombre: "sysadmin",
            descripcion: "Superusuario del sistema",
            permisos: sysadminPerms,
            esSistema: true,
            prioridad: 1,
        },
        {
            nombre: "admin",
            descripcion: "Administrador",
            permisos: adminPerms,
            esSistema: true,
            prioridad: 10,
        },
    ];

    for (const role of defaults) {
        await TipoUsuario.findOrCreate({
            where: { nombre: role.nombre },
            defaults: role,
        });
    }
}

export async function ensureDefaultReservaStates() {
    const estados = [
        { nombre: "pendiente", descripcion: "Reserva creada, esperando confirmación/garantía", prioridad: 100, esDefault: true },
        { nombre: "confirmada", descripcion: "Reserva garantizada (tarjeta/depósito)", prioridad: 90 },
        { nombre: "checkin", descripcion: "Huésped ingresó (estancia en curso)", prioridad: 80 },
        { nombre: "checkout", descripcion: "Estadía finalizada (salida realizada)", prioridad: 70 },
        { nombre: "cancelada", descripcion: "Reserva anulada antes del inicio", prioridad: 60 },
        //{ nombre: "no_show", descripcion: "Huésped no se presentó", prioridad: 50 },
    ];

    // Crear los estados si no existen
    for (const e of estados) {
        await EstadoReserva.findOrCreate({
            where: { nombre: e.nombre },
            defaults: e,
        });
    }

    // Asegurar que solo "pendiente" sea el default (único true)
    // Primero, apaga todos
    await EstadoReserva.update({ esDefault: false }, { where: {} });
    // Luego, enciende el deseado
    await EstadoReserva.update({ esDefault: true }, { where: { nombre: "pendiente" } });
}