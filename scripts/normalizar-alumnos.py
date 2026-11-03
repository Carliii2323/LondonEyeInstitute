#!/usr/bin/env python3
"""
normalizar-alumnos.py — convierte la planilla STUDENTS 2026 en un JSON limpio.

Se separa de la carga a proposito: este paso NO toca la API. Produce un archivo
que se puede abrir y revisar antes de que nada se escriba en el sistema.

Resuelve cuatro cosas que la planilla trae mal o incompletas:

  1. DNI guardados como numero: Excel los devuelve "53315469.0". Limpiarlos con
     una regex de no-digitos daria "533154690" (9 digitos, mal), asi que se
     convierten por float->int.
  2. Alumnos sin DNI: reciben uno generico 00000001..N. Formato imposible de
     confundir con uno real (ningun DNI argentino empieza con cinco ceros) y
     facil de listar despues buscando "0000000".
  3. Email: cascada propio -> del tutor -> temporal @alumno.invalid.
  4. Fecha de nacimiento: derivada del NIVEL DEL CURSO, no al azar. El sistema
     la usa para saber si el alumno es menor y exigir tutor; una fecha random
     podria clasificar a un nene de KIDS como adulto.

Lo que NO inventa: telefono, direccion y datos del tutor quedan vacios. Son
opcionales en la API, y vacio es distinguible de "cargado mal"; un telefono
inventado no lo es.
"""
import json, re, unicodedata
from datetime import date
from pathlib import Path
import openpyxl

PLANILLA = Path(r"C:\Users\Carlii\Downloads\STUDENTS 2026(1).xlsx")
SALIDA   = Path(__file__).parent / "alumnos-2026.json"
DOMINIO  = "alumno.invalid"
HOY      = date(2026, 10, 28)

# Hoja de la planilla -> nombre del curso en el sistema.
# OJO: hay dos pares de comisiones distintas que en la planilla se distinguen
# solo por un punto. Necesitan nombres DIFERENTES en el sistema o se mezclan.
CURSOS = {
    "Conversation I":  {"curso": "Conversation I",   "edad": (18, 45)},
    "Conversation II": {"curso": "Conversation II",  "edad": (18, 45)},
    "KIDS I":          {"curso": "KIDS I",           "edad": (8, 10)},
    "KIDS II":         {"curso": "KIDS II - A",      "edad": (9, 11)},
    "KIDS II.":        {"curso": "KIDS II - B",      "edad": (9, 11)},
    "PRE-TEENS I":     {"curso": "PRE-TEENS I - A",  "edad": (11, 13)},
    "Pre-Teens I.":    {"curso": "PRE-TEENS I - B",  "edad": (11, 13)},
    "PRE-TEENS III":   {"curso": "PRE-TEENS III",    "edad": (12, 14)},
    "TEENS III":       {"curso": "TEENS III",        "edad": (14, 16)},
}

def titulo(t):
    return " ".join(p[:1].upper() + p[1:].lower() for p in t.split() if p)

def partir_nombre(crudo):
    if "," not in crudo:
        return None
    ape, nom = crudo.split(",", 1)
    ape, nom = ape.strip(), nom.strip()
    if len(ape) < 2 or len(nom) < 2:
        return None
    return titulo(ape), titulo(nom)

def limpiar_dni(crudo):
    """'53315469.0' -> '53315469'. Devuelve '' si no hay dato."""
    crudo = (crudo or "").strip()
    if not crudo:
        return ""
    try:
        return str(int(float(crudo)))
    except ValueError:
        return re.sub(r"\D", "", crudo)

def semilla(texto):
    """Entero estable a partir del nombre: la fecha generada no cambia entre corridas."""
    base = unicodedata.normalize("NFD", texto).encode("ascii", "ignore")
    return sum(b * (i + 1) for i, b in enumerate(base))

def fecha_nacimiento(nombre, rango):
    lo, hi = rango
    s = semilla(nombre)
    edad = lo + (s % (hi - lo + 1))
    mes = 1 + (s // 7) % 12
    dia = 1 + (s // 13) % 28          # 28 evita meses invalidos
    return f"{HOY.year - edad:04d}-{mes:02d}-{dia:02d}"

def main():
    wb = openpyxl.load_workbook(PLANILLA, data_only=True)
    alumnos, avisos, generico = [], [], 0

    for hoja, cfg in CURSOS.items():
        if hoja not in wb.sheetnames:
            avisos.append(f"la planilla no tiene la hoja {hoja!r}")
            continue
        for fila in wb[hoja].iter_rows(values_only=True):
            c = [("" if v is None else str(v).strip()) for v in fila]
            if not any(c) or not c[0]:
                continue
            while len(c) < 4:
                c.append("")
            crudo, dni_crudo, mail, mail_tutor = c[0], c[1], c[2], c[3]

            partido = partir_nombre(crudo)
            if not partido:
                avisos.append(f"nombre sin coma, se descarta: {crudo!r} ({hoja})")
                continue
            apellido, nombre = partido

            dni = limpiar_dni(dni_crudo)
            dni_real = bool(dni)
            if not dni:
                generico += 1
                dni = f"{generico:08d}"

            if mail:
                email, origen = mail, "propio"
            elif mail_tutor:
                email, origen = mail_tutor, "del tutor"
            else:
                email, origen = f"{dni}@{DOMINIO}", "temporal"

            alumnos.append({
                "curso": cfg["curso"],
                "hoja": hoja,
                "apellido": apellido,
                "nombre": nombre,
                "dni": dni,
                "dni_real": dni_real,
                "email": email,
                "email_origen": origen,
                "birth_date": fecha_nacimiento(crudo, cfg["edad"]),
                # Se guarda aparte: el sistema NO tiene campo para el mail del
                # tutor, asi que este dato solo viaja en el reporte.
                "email_tutor": mail_tutor,
            })

    # El email es UNICO en la base: cualquier choque aca es un alta fallida alla.
    vistos = {}
    for a in alumnos:
        k = a["email"].lower()
        if k in vistos:
            avisos.append(f"EMAIL REPETIDO {a['email']} ({vistos[k]} y {a['apellido']}, {a['nombre']})")
        vistos[k] = f"{a['apellido']}, {a['nombre']}"

    SALIDA.write_text(json.dumps({
        "generado": HOY.isoformat(),
        "origen": PLANILLA.name,
        "cursos": sorted({a["curso"] for a in alumnos}),
        "alumnos": alumnos,
        "avisos": avisos,
    }, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"alumnos        : {len(alumnos)}")
    print(f"cursos         : {len(set(a['curso'] for a in alumnos))}")
    print(f"DNI genericos  : {generico}")
    print(f"email propio   : {sum(1 for a in alumnos if a['email_origen']=='propio')}")
    print(f"email tutor    : {sum(1 for a in alumnos if a['email_origen']=='del tutor')}")
    print(f"email temporal : {sum(1 for a in alumnos if a['email_origen']=='temporal')}")
    print(f"avisos         : {len(avisos)}")
    for v in avisos:
        print("   -", v)
    print(f"\n-> {SALIDA}")

if __name__ == "__main__":
    main()
