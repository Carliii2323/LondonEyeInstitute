#!/usr/bin/env node
/* ============================================================
 * importar-alumnos.mjs — carga masiva de alumnos e inscripciones.
 *
 * Lee scripts/alumnos-2026.json (lo genera normalizar-alumnos.py a partir de
 * la planilla) y va contra la API, no contra la base: pasa por las mismas
 * validaciones que el alta del panel.
 *
 * POR DEFECTO NO ESCRIBE NADA: muestra que haria y termina.
 * Para que cargue de verdad hay que pasarle --ejecutar.
 *
 * USO
 *   # 1. Simulacion (no toca nada):
 *   ADMIN_EMAIL=admin@... ADMIN_PASSWORD=... node scripts/importar-alumnos.mjs
 *
 *   # 2. Carga real:
 *   ADMIN_EMAIL=admin@... ADMIN_PASSWORD=... node scripts/importar-alumnos.mjs --ejecutar
 *
 * VARIABLES
 *   ADMIN_EMAIL / ADMIN_PASSWORD  (obligatorias)
 *   API_URL   por defecto http://localhost:8080/api/v1
 *   DATOS     por defecto scripts/alumnos-2026.json
 *
 * Es RE-EJECUTABLE: indexa por DNI los alumnos que ya existen, asi que volver
 * a correrlo no duplica ni corta en el primer conflicto.
 * ============================================================ */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = process.env.DATOS ?? path.join(AQUI, "alumnos-2026.json");
const API = (process.env.API_URL ?? "http://localhost:8080/api/v1").replace(/\/+$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const EJECUTAR = process.argv.includes("--ejecutar");

const log = (...a) => console.log(...a);
const err = (...a) => console.error(...a);

function generarPassword() {
  // 12 caracteres sin ambiguos (l/1/O/0) para que se puedan dictar por telefono.
  const abc = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.randomBytes(12), (b) => abc[b % abc.length]).join("");
}

/** Solo digitos, para comparar DNI contra los que ya estan cargados. */
const soloDigitos = (s) => (s ?? "").replace(/\D/g, "");

/** La API pagina con page_size. OJO: "limit" se ignora silenciosamente. */
const listar = (datos) => (Array.isArray(datos) ? datos : datos?.data ?? datos?.items ?? []);

async function llamar(metodo, ruta, { body, token } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  return { ok: res.ok, status: res.status, datos };
}

async function main() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    err("Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD.");
    err("Ejemplo: ADMIN_EMAIL=admin@londoneye.com ADMIN_PASSWORD=clave node scripts/importar-alumnos.mjs");
    process.exit(1);
  }
  if (!fs.existsSync(DATOS)) {
    err(`No se encontro ${DATOS}. Genera el JSON primero:`);
    err("   python scripts/normalizar-alumnos.py");
    process.exit(1);
  }

  const { alumnos, avisos = [] } = JSON.parse(fs.readFileSync(DATOS, "utf8"));

  log(`\nAPI   : ${API}`);
  log(`Datos : ${DATOS}`);
  log(`Modo  : ${EJECUTAR ? "EJECUCION REAL (va a crear datos)" : "SIMULACION (no escribe nada)"}\n`);
  log(`Alumnos en el archivo : ${alumnos.length}`);
  log(`Cursos distintos      : ${new Set(alumnos.map((a) => a.curso)).size}`);
  log(`DNI genericos         : ${alumnos.filter((a) => !a.dni_real).length}`);
  if (avisos.length) {
    log(`\nAvisos del archivo de datos:`);
    for (const v of avisos) log(`   - ${v}`);
  }

  const login = await llamar("POST", "/auth/login", {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  if (!login.ok) {
    err(`\nNo se pudo entrar como admin (HTTP ${login.status}).`);
    err(login.datos);
    process.exit(1);
  }
  const token = login.datos.access_token;
  log(`\nSesion de admin iniciada.`);

  const cursosRes = await llamar("GET", "/admin/courses?page=1&page_size=500", { token });
  if (!cursosRes.ok) {
    err(`No se pudo leer la lista de cursos (HTTP ${cursosRes.status}).`);
    process.exit(1);
  }
  const cursos = listar(cursosRes.datos);
  const idPorCurso = new Map();
  let faltan = false;

  for (const nombre of new Set(alumnos.map((a) => a.curso))) {
    const coincidencias = cursos.filter(
      (c) => (c.name ?? "").trim().toLocaleLowerCase() === nombre.trim().toLocaleLowerCase(),
    );
    if (coincidencias.length === 1) idPorCurso.set(nombre, coincidencias[0].id);
    else if (coincidencias.length === 0) { err(`   FALTA el curso "${nombre}"`); faltan = true; }
    else { err(`   AMBIGUO: hay ${coincidencias.length} cursos llamados "${nombre}"`); faltan = true; }
  }

  if (faltan) {
    err(`\nCursos que existen hoy en el sistema:`);
    for (const c of cursos) err(`   - ${c.name}`);
    err(`\nCrealos con ESE nombre exacto (ver el documento de carga) y volve a correr.`);
    process.exit(1);
  }
  log(`Los ${idPorCurso.size} cursos existen y son unicos.`);

  if (!EJECUTAR) {
    log(`\n--- Lo que se crearia (muestra de 5) ---`);
    for (const a of alumnos.slice(0, 5)) {
      log(`   ${a.apellido}, ${a.nombre} | ${a.dni} | ${a.email} | ${a.birth_date} | ${a.curso}`);
    }
    log(`   ... y ${Math.max(0, alumnos.length - 5)} mas.`);
    log(`\nSIMULACION: no se creo nada. Agrega --ejecutar para la carga real.\n`);
    return;
  }

  const listaRes = await llamar("GET", "/admin/students?page=1&page_size=1000", { token });
  const existentes = new Map();
  for (const s of listar(listaRes.datos)) existentes.set(soloDigitos(s.dni), s.id);

  const reporte = [];
  let creados = 0, yaEstaban = 0, inscriptos = 0, fallados = 0;

  for (const a of alumnos) {
    const clave = soloDigitos(a.dni);
    let studentId = existentes.get(clave);
    let estado;
    const password = generarPassword();

    if (studentId) {
      estado = "ya existia";
      yaEstaban++;
    } else {
      const res = await llamar("POST", "/admin/students", {
        token,
        body: {
          email: a.email,
          password,
          first_name: a.nombre,
          last_name: a.apellido,
          dni: a.dni,
          birth_date: a.birth_date,
        },
      });
      if (res.ok) {
        studentId = res.datos?.id;
        estado = "creado";
        creados++;
        existentes.set(clave, studentId);
      } else {
        estado = `ERROR ${res.status}: ${JSON.stringify(res.datos)}`;
        fallados++;
      }
    }

    let estadoInscripcion = "-";
    if (studentId) {
      const ins = await llamar("POST", "/admin/enrollments", {
        token,
        body: { student_id: studentId, course_id: idPorCurso.get(a.curso) },
      });
      if (ins.ok) { estadoInscripcion = "inscripto"; inscriptos++; }
      else if (ins.status === 409) estadoInscripcion = "ya inscripto";
      else estadoInscripcion = `ERROR ${ins.status}`;
    }

    log(`   ${estado.padEnd(12)} ${estadoInscripcion.padEnd(14)} ${a.apellido}, ${a.nombre}`);
    reporte.push({ ...a, password: estado === "creado" ? password : "(ya existia)", estado, estadoInscripcion });
  }

  const fecha = new Date().toISOString().slice(0, 10);
  const salida = path.resolve(`importacion-alumnos-${fecha}.csv`);
  const cols = ["curso", "apellido", "nombre", "dni", "dni_real", "email", "email_origen", "email_tutor", "birth_date", "password", "estado", "estadoInscripcion"];
  const csv = [
    cols.join(","),
    ...reporte.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(",")),
  ].join("\n");
  fs.writeFileSync(salida, csv, "utf8");

  log(`\n======================================`);
  log(`Creados        : ${creados}`);
  log(`Ya existian    : ${yaEstaban}`);
  log(`Inscripciones  : ${inscriptos}`);
  log(`Fallados       : ${fallados}`);
  log(`\nReporte con usuarios, contrasenas y mails de tutor: ${salida}`);
  log(`GUARDALO BIEN: es la unica copia de las contrasenas generadas.\n`);
}

main().catch((e) => { err(e); process.exit(1); });
