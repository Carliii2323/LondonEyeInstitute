#!/usr/bin/env python3
"""
generar-documento-carga.py — arma el documento de carga desde alumnos-2026.json.

Se genera del MISMO archivo que consume el importador, a proposito: asi el
documento y lo que realmente se carga no pueden desincronizarse.
"""
import json, html
from collections import defaultdict
from datetime import date
from pathlib import Path

AQUI = Path(__file__).parent
DATOS = AQUI / "alumnos-2026.json"
SALIDA = AQUI.parent / "Documentos" / "Carga-Alumnos-2026.html"
HOY = date(2026, 10, 28)

d = json.loads(DATOS.read_text(encoding="utf-8"))
alumnos = d["alumnos"]

por_curso = defaultdict(list)
for a in alumnos:
    por_curso[a["curso"]].append(a)
for v in por_curso.values():
    v.sort(key=lambda x: (x["apellido"], x["nombre"]))

def edad(iso):
    y, m, dd = map(int, iso.split("-"))
    return HOY.year - y - ((HOY.month, HOY.day) < (m, dd))

e = html.escape
genericos = [a for a in alumnos if not a["dni_real"]]
temporales = [a for a in alumnos if a["email_origen"] == "temporal"]
del_tutor = [a for a in alumnos if a["email_origen"] == "del tutor"]
con_tutor = [a for a in alumnos if a["email_tutor"]]

filas_cursos = "\n".join(
    f"<tr><td><code>{e(c)}</code></td><td>{len(por_curso[c])}</td>"
    f"<td class=small>{e(por_curso[c][0]['hoja'])}</td></tr>"
    for c in sorted(por_curso)
)

bloques = []
for curso in sorted(por_curso):
    filas = []
    for a in por_curso[curso]:
        marca_dni = "" if a["dni_real"] else ' <span class="tag gen">generico</span>'
        origen = {"propio": "", "del tutor": ' <span class="tag tut">del tutor</span>',
                  "temporal": ' <span class="tag tmp">temporal</span>'}[a["email_origen"]]
        filas.append(
            f"<tr><td>{e(a['apellido'])}, {e(a['nombre'])}</td>"
            f"<td class=mono>{e(a['dni'])}{marca_dni}</td>"
            f"<td class=mono>{e(a['birth_date'])} <span class=small>({edad(a['birth_date'])} a.)</span></td>"
            f"<td class=mail>{e(a['email'])}{origen}</td>"
            f"<td class='mail small'>{e(a['email_tutor']) or '—'}</td></tr>"
        )
    bloques.append(f"""
<h3>{e(curso)} <span class="n">{len(por_curso[curso])} alumnos</span></h3>
<table>
<tr><th>Alumno</th><th>DNI</th><th>Fecha nac.</th><th>Email (login)</th><th>Mail del tutor</th></tr>
{''.join(filas)}
</table>""")

doc = f"""<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Carga de alumnos 2026</title>
<style>
  @page {{ size: A4; margin: 15mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: "Segoe UI", Arial, sans-serif; color:#1f2733; font-size:11px; line-height:1.45; }}
  h1 {{ font-size:21px; color:#1e3a8a; margin:0 0 2px; }}
  h2 {{ font-size:14px; color:#1e40af; margin:22px 0 6px; padding-bottom:4px; border-bottom:2px solid #dbe3f4; page-break-after:avoid; }}
  h3 {{ font-size:12px; margin:16px 0 5px; color:#16212b; page-break-after:avoid; }}
  h3 .n {{ font-weight:400; color:#64748b; font-size:10.5px; }}
  .sub {{ color:#64748b; margin:0 0 12px; }}
  table {{ border-collapse:collapse; width:100%; margin:4px 0 10px; page-break-inside:auto; }}
  th,td {{ border:1px solid #e2e8f0; padding:3px 6px; text-align:left; vertical-align:top; }}
  th {{ background:#f1f5f9; font-size:9.5px; text-transform:uppercase; letter-spacing:.04em; color:#64748b; }}
  tr {{ page-break-inside:avoid; }}
  .mono {{ font-family:Consolas,monospace; }}
  .mail {{ font-family:Consolas,monospace; font-size:9.5px; word-break:break-all; }}
  .small {{ font-size:9.5px; color:#64748b; }}
  code {{ font-family:Consolas,monospace; background:#f1f5f9; padding:1px 4px; border-radius:3px; }}
  .tag {{ font-size:8.5px; font-weight:700; padding:0 4px; border-radius:8px; white-space:nowrap; }}
  .gen {{ background:#fee2e2; color:#991b1b; }}
  .tut {{ background:#fef3c7; color:#92400e; }}
  .tmp {{ background:#e0e7ff; color:#3730a3; }}
  .box {{ background:#f8fafc; border-left:3px solid #94a3b8; padding:7px 10px; margin:8px 0; }}
  .warn {{ background:#fffbeb; border-left:3px solid #d97706; padding:7px 10px; margin:8px 0; }}
  ol,ul {{ margin:4px 0 8px; padding-left:18px; }} li {{ margin:2px 0; }}
  pre {{ background:#0f172a; color:#e2e8f0; padding:8px 10px; border-radius:5px; font-family:Consolas,monospace; font-size:10px; white-space:pre-wrap; }}
</style></head><body>

<h1>Carga de alumnos 2026</h1>
<p class="sub">SGE London Eye &middot; generado el {d['generado']} desde <code>{e(d['origen'])}</code></p>

<div class="box">
<strong>{len(alumnos)} alumnos</strong> en <strong>{len(por_curso)} cursos</strong>.
Este documento sale del mismo archivo que consume el importador
(<code>scripts/alumnos-2026.json</code>), asi que refleja exactamente lo que se va a cargar.
</div>

<h2>1. Cursos a crear ANTES de importar</h2>
<p>El importador busca los cursos por <strong>nombre exacto</strong> y se detiene si falta alguno
o si hay dos iguales. Hay que crearlos primero desde el panel, con estos nombres:</p>
<table>
<tr><th>Nombre exacto en el sistema</th><th>Alumnos</th><th>Hoja de la planilla</th></tr>
{filas_cursos}
</table>

<div class="warn">
<strong>Las comisiones repetidas.</strong> En la planilla hay dos hojas <code>KIDS II</code> y dos
<code>PRE-TEENS I</code>, que se distinguen solo por un punto en el nombre. Son
<strong>comisiones distintas</strong> (no comparten ningun alumno), asi que se renombraron a
<code>- A</code> y <code>- B</code>. Si se crearan con el mismo nombre, el importador las marcaria
como ambiguas y no cargaria nada; si ademas se unificaran, se mezclarian dos grupos en un curso.
</div>

<h2>2. Datos generados y supuestos</h2>
<p>La planilla trae cuatro columnas (nombre, DNI, mail, mail del tutor). El resto se completo asi:</p>
<ul>
<li><strong>Fecha de nacimiento: generada</strong>, derivada del <strong>nivel del curso</strong> (KIDS 8-10,
PRE-TEENS 11-13, TEENS 14-16, Conversation adultos), no al azar. Motivo: el sistema usa esa fecha
para saber si el alumno es <strong>menor</strong> y exigir tutor; una fecha aleatoria podria
clasificar a un nene de KIDS como adulto. <strong>Son datos inventados y hay que corregirlos.</strong></li>
<li><strong>Telefono, direccion y datos del tutor: vacios</strong>, a proposito. Son opcionales en el
alta, y vacio se distingue de "cargado mal"; un telefono inventado, no.</li>
<li><strong>DNI:</strong> los de la planilla venian como numero decimal (<code>53315469.0</code>) y se
convirtieron a entero. {len(genericos)} alumnos sin DNI recibieron uno <strong>generico</strong>
(<code>00000001</code> a <code>{genericos[-1]['dni'] if genericos else ''}</code>): ningun DNI real
empieza con cinco ceros, y se listan todos buscando <code>0000000</code> en el panel.</li>
<li><strong>Email (es el usuario con el que entra):</strong> propio si lo tenia
({len(alumnos)-len(del_tutor)-len(temporales)}), si no el del tutor ({len(del_tutor)}),
y si no habia ninguno, uno temporal <code>@alumno.invalid</code> ({len(temporales)}).</li>
<li><strong>Mail del tutor:</strong> el sistema <strong>no tiene campo</strong> para guardarlo. Los
{len(con_tutor)} que lo tienen figuran en la ultima columna de las tablas de abajo y en el reporte
de la importacion, para cargarlos a mano donde corresponda.</li>
</ul>

<div class="warn">
<strong>Antes de emitir un certificado</strong> a cualquiera de los {len(genericos)} con DNI generico,
hay que corregirle el DNI: el certificado es un documento oficial y lo imprime.
</div>

<h2>3. Procedimiento</h2>
<ol>
<li>Crear los {len(por_curso)} cursos del punto 1, con el nombre exacto.</li>
<li>Correr la <strong>simulacion</strong> (no escribe nada) y revisar que no falte ningun curso:</li>
</ol>
<pre>$env:ADMIN_EMAIL = "admin@..."
$env:ADMIN_PASSWORD = "..."
node scripts/importar-alumnos.mjs</pre>
<ol start="3">
<li>Si la simulacion esta limpia, la carga real:</li>
</ol>
<pre>node scripts/importar-alumnos.mjs --ejecutar</pre>
<ol start="4">
<li>Guardar el <code>importacion-alumnos-AAAA-MM-DD.csv</code> que queda: es la
<strong>unica copia de las contrasenas</strong> generadas. Ya esta en el <code>.gitignore</code>.</li>
</ol>
<p class="small">El script es re-ejecutable: indexa por DNI a los que ya existen, asi que volver a
correrlo no duplica ni se corta en el primer conflicto.</p>

<h2>4. Alumnos por curso</h2>
<p class="small">
<span class="tag gen">generico</span> DNI inventado &middot;
<span class="tag tut">del tutor</span> entra con el mail de la madre/padre &middot;
<span class="tag tmp">temporal</span> mail inventado
</p>
{''.join(bloques)}

<p class="small" style="margin-top:18px">SGE London Eye &mdash; documento de carga generado automaticamente.
Si cambia la planilla, volver a correr <code>normalizar-alumnos.py</code> y este script.</p>
</body></html>"""

SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(doc, encoding="utf-8")
print(f"alumnos: {len(alumnos)} | cursos: {len(por_curso)} | genericos: {len(genericos)} | tutor: {len(con_tutor)}")
print(f"-> {SALIDA}")
