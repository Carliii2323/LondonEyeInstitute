import type { ReactNode } from 'react'

/* ============================================================
 * ContractSheet — Contrato de Prestación de Servicios Educativos
 *
 * Reproduce el contrato pedagógico del instituto (texto fijo) como PLANTILLA
 * EN BLANCO: todos los campos (contratante, alumno, curso, aranceles, firmas)
 * quedan como líneas para completar a mano. Se descarga en PDF multi-página
 * cortando solo en los límites de bloque (ver downloadPaginatedPdf): cada
 * sección lleva data-block para que ninguna cláusula quede partida.
 * Tamaños en px fijos (html2canvas no soporta container queries).
 * ============================================================ */

const LOGO_SRC = '/london-eye-logo.png'

/** Línea en blanco para completar a mano. Usa un &nbsp; real como contenido
 *  (no una caja vacía) y baja el subrayado con padding-bottom: así html2canvas
 *  lo renderiza igual que el navegador, apoyado bajo el renglón del texto. */
function Fill({ min = '140px' }: { min?: string }) {
  return (
    <span
      className="mx-1 inline-block border-b border-surface-500"
      style={{ minWidth: min, paddingBottom: '3px' }}
    >
      {' '}
    </span>
  )
}

function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div data-block className="mt-3">
      <h3 className="text-[12.5px] font-bold text-surface-900">{title}</h3>
      <div className="mt-0.5 flex flex-col gap-1 text-[12px] leading-snug text-surface-800">{children}</div>
    </div>
  )
}

export function ContractSheet({ sheetClassName }: { sheetClassName: string }) {
  return (
    <div className={`bg-white text-surface-900 ${sheetClassName}`}>
      <div className="px-10 py-8">
        {/* Encabezado + partes (un solo bloque, no se separa) */}
        <div data-block>
          <div className="flex flex-col items-center text-center">
            <img src={LOGO_SRC} alt="" className="h-16 w-auto object-contain" />
            <h1 className="mt-2 text-[15px] font-bold uppercase text-surface-900">London Eye English Institute</h1>
            <h2 className="text-[13px] font-bold uppercase text-surface-900">Contrato de Prestación de Servicios Educativos</h2>
          </div>

          <div className="mt-4 flex flex-col gap-1.5 text-[12px] leading-snug text-surface-800">
            <p>
              Entre <strong>LONDON EYE ENGLISH INSTITUTE</strong>, representado por su propietaria y Directora, Silvana Verónica
              Jerez, DNI N.º 33.890.523, CUIT 27-33890523-3, con domicilio en A. Aguado y M. Gaviola 652, Ciudad de Rivadavia,
              Provincia de Mendoza, en adelante <strong>LA INSTITUCIÓN</strong>, y por la otra parte:
            </p>
            <p className="leading-loose">
              Sr./Sra.: <Fill min="240px" />, DNI: <Fill />, domicilio: <Fill min="240px" />, teléfono: <Fill />, correo
              electrónico: <Fill min="240px" />, quien actúa en representación del alumno/a: <Fill min="240px" />, DNI:{' '}
              <Fill />, curso/Nivel: <Fill min="220px" />, en adelante <strong>EL CONTRATANTE</strong>, acuerdan celebrar el
              presente Contrato de Prestación de Servicios Educativos, sujeto a las siguientes cláusulas:
            </p>
          </div>
        </div>

        <Clause title="PRIMERA. OBJETO">
          <p>
            La Institución se obliga a prestar el servicio educativo correspondiente al curso de inglés contratado, conforme al
            plan académico, modalidad, carga horaria y calendario establecidos para el ciclo lectivo.
          </p>
          <p>
            Las clases podrán desarrollarse de manera presencial, virtual o mixta cuando circunstancias académicas, sanitarias
            o de fuerza mayor así lo requieran.
          </p>
        </Clause>

        <Clause title="SEGUNDA. DURACIÓN">
          <p>
            El presente contrato tendrá vigencia desde la fecha de inscripción hasta la finalización del ciclo lectivo
            correspondiente o hasta la conclusión del curso contratado.
          </p>
        </Clause>

        <Clause title="TERCERA. ARANCELES">
          <p>
            El Contratante abonará la cuota mensual correspondiente dentro del período comprendido entre el día 1 y el día 20 de
            cada mes, conforme al Anexo II – Aranceles Vigentes.
          </p>
        </Clause>

        <Clause title="CUARTA. ACTUALIZACIÓN DE ARANCELES">
          <p>
            La Institución podrá actualizar los valores de matrícula, cuotas, derechos de examen y demás aranceles cuando
            existan modificaciones significativas en los costos de funcionamiento, inflación u otras circunstancias económicas.
          </p>
        </Clause>

        <Clause title="QUINTA. ASISTENCIA">
          <p>
            Para conservar la condición de alumno regular será necesario cumplir con un mínimo del ochenta por ciento (80 %) de
            asistencia anual.
          </p>
          <p>Las inasistencias no generan derecho a reintegro económico ni recuperación individual de clases.</p>
          <p>Las clases no se recuperan, ya que las mismas están garantizadas para todo el corriente año.</p>
        </Clause>

        <Clause title="SEXTA. PUNTUALIDAD">
          <p>Los alumnos deberán respetar los horarios de ingreso y egreso establecidos por la Institución.</p>
          <p>
            El horario de permanencia permitido es de hasta 10 minutos antes del inicio de la clase y hasta 10 minutos después
            de su finalización. No se permitirá el ingreso de estudiantes con mayor anticipación ni su permanencia una vez
            transcurridos los 10 minutos posteriores a la finalización de la clase.
          </p>
          <p>
            Se solicita a las familias organizar el ingreso y el retiro de sus hijos dentro de los horarios establecidos. La
            responsabilidad sobre los estudiantes fuera del horario indicado corresponde exclusivamente a sus padres, madres o
            tutores.
          </p>
        </Clause>

        <Clause title="SÉPTIMA. FERIADOS Y SUSPENSIÓN DE ACTIVIDADES">
          <p>
            La institución se rige por el calendario escolar y las disposiciones vigentes de la Dirección General de Escuelas de
            la Provincia de Mendoza. Por tal motivo, no se dictarán clases durante los feriados nacionales y provinciales, ya que
            en esas fechas los estudiantes no cuentan con la cobertura del seguro escolar correspondiente.
          </p>
          <p>
            Asimismo, cuando la Dirección General de Escuelas disponga la suspensión de actividades presenciales por viento Zonda
            u otras contingencias climáticas, las clases también serán suspendidas. En dichas situaciones, el personal de la
            institución y los alumnos no cuentan con la cobertura del seguro correspondiente para desarrollar actividades
            presenciales.
          </p>
        </Clause>

        <Clause title="OCTAVA. DERECHO DE EXAMEN">
          <p>
            La evaluación será continua mediante actividades orales y escritas. Para acceder a evaluaciones finales, certificados
            y constancias será requisito encontrarse al día con todas las obligaciones económicas.
          </p>
          <p>
            El alumno deberá rendir dos (2) Exámenes Globales, escritos y orales, correspondientes a los meses de julio y
            diciembre, los cuales integrarán los contenidos desarrollados hasta cada instancia evaluativa. Los exámenes tienen el
            valor determinado independientemente del arancel. No se abona la cuota del mes de julio y diciembre.
          </p>
          <p>
            Al finalizar el curso y exámenes, el alumno recibirá un boletín con las calificaciones y el certificado respecto a la
            comprensión lectora, auditiva y reproductora adquirida durante el año. Si el alumno no está al día con el pago de las
            cuotas anteriores no podrá rendir los exámenes, por lo tanto, se reprogramará la fecha del examen.
          </p>
        </Clause>

        <Clause title="NOVENA. OBLIGACIONES DE LA INSTITUCIÓN">
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Brindar enseñanza conforme al programa académico.</li>
            <li>Proporcionar docentes capacitados.</li>
            <li>Mantener un ambiente adecuado para el aprendizaje.</li>
            <li>Informar oportunamente cualquier modificación académica.</li>
          </ul>
        </Clause>

        <Clause title="DÉCIMA. OBLIGACIONES DEL ALUMNO">
          <ul className="ml-4 list-disc space-y-0.5">
            <li>Cumplir con el pago de los aranceles.</li>
            <li>Respetar las normas institucionales.</li>
            <li>Asistir regularmente a clases.</li>
            <li>Mantener actualizados sus datos personales.</li>
            <li>Copiar las tareas y/o ponerse al día con los temas explicados con anterioridad, en caso de inasistencia.</li>
            <li>Enviar certificado médico para justificar las faltas.</li>
          </ul>
        </Clause>

        <Clause title="DÉCIMA PRIMERA. CONVIVENCIA">
          <p>
            La Institución podrá aplicar medidas disciplinarias o disponer la desvinculación del alumno en casos de violencia,
            discriminación, acoso, daños al establecimiento o incumplimiento reiterado del reglamento interno.
          </p>
        </Clause>

        <Clause title="DÉCIMA SEGUNDA. BAJA DEL CURSO">
          <p>La solicitud de baja deberá presentarse por escrito con una anticipación mínima de treinta (30) días.</p>
          <p>
            Será obligación del padre/tutor/alumno mantener al día el pago de la cuota mensual al momento de solicitar la
            rescisión del contrato.
          </p>
        </Clause>

        <Clause title="DÉCIMA TERCERA. RESPONSABILIDAD">
          <p>La Institución no será responsable por pérdida, extravío o deterioro de objetos personales.</p>
        </Clause>

        <Clause title="DÉCIMA CUARTA. DATOS PERSONALES">
          <p>
            Los datos personales serán utilizados exclusivamente para fines académicos y administrativos conforme a la Ley
            25.326.
          </p>
        </Clause>

        <Clause title="DÉCIMA QUINTA. USO DE IMAGEN">
          <p>La autorización de uso de imagen se regirá por el Anexo III – Autorizaciones.</p>
        </Clause>

        <Clause title="DÉCIMA SEXTA. COMUNICACIONES">
          <p>
            Las comunicaciones oficiales podrán realizarse por correo electrónico, WhatsApp, plataforma educativa o circulares
            institucionales.
          </p>
        </Clause>

        <Clause title="DÉCIMA SÉPTIMA. CERTIFICADOS">
          <p>
            Los certificados serán emitidos únicamente cuando el alumno haya cumplido con los requisitos académicos y
            económicos.
          </p>
        </Clause>

        <Clause title="DÉCIMA OCTAVA. JURISDICCIÓN">
          <p>
            Las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Tercera Circunscripción Judicial de la
            Provincia de Mendoza.
          </p>
        </Clause>

        {/* ANEXO I */}
        <div data-block className="mt-6">
          <h3 className="text-[13px] font-bold uppercase text-surface-900">Anexo I – Reglamento de Convivencia</h3>
          <p className="mt-1 text-[12px] text-surface-800">El alumno se compromete a:</p>
          <ul className="ml-4 mt-1 list-disc space-y-0.5 text-[12px] text-surface-800">
            <li>Respetar a docentes, compañeros y personal de la Institución.</li>
            <li>Cuidar las instalaciones y materiales. En caso de daños, los padres/tutores deberán responder por los daños.</li>
            <li>Evitar conductas agresivas, discriminatorias o de acoso.</li>
            <li>Utilizar el celular únicamente cuando el docente lo autorice.</li>
            <li>Respetar horarios de ingreso y egreso.</li>
            <li>Mantener una actitud adecuada para el aprendizaje.</li>
          </ul>
          <p className="mt-1 text-[12px] text-surface-800">
            El incumplimiento podrá dar lugar a apercibimientos, suspensión o desvinculación.
          </p>
        </div>

        {/* ANEXO II */}
        <div data-block className="mt-6">
          <h3 className="text-[13px] font-bold uppercase text-surface-900">Anexo II – Aranceles Vigentes</h3>
          <div className="mt-2 max-w-[360px] text-[12px] text-surface-800">
            <div className="flex justify-between border-b border-dotted border-surface-300 py-1">
              <span>Matrícula / Inscripción anual</span><span>$ <Fill min="90px" /></span>
            </div>
            <div className="flex justify-between border-b border-dotted border-surface-300 py-1">
              <span>Cuota mensual</span><span>$ <Fill min="90px" /></span>
            </div>
            <div className="flex justify-between border-b border-dotted border-surface-300 py-1">
              <span>Recargo por mora</span><span>$ <Fill min="90px" /></span>
            </div>
          </div>
          <p className="mt-2 text-[12px] font-bold text-surface-800">Medios de pago</p>
          <ul className="ml-4 mt-0.5 list-disc space-y-0.5 text-[12px] text-surface-800">
            <li>Transferencia bancaria</li>
            <li>Mercado Pago</li>
            <li>Efectivo</li>
            <li>En la Institución</li>
          </ul>
        </div>

        {/* ANEXO III */}
        <div data-block className="mt-6">
          <h3 className="text-[13px] font-bold uppercase text-surface-900">Anexo III – Autorizaciones</h3>
          <p className="mt-1 text-[12px] text-surface-800">
            Autorizo el uso de fotografías y videos del alumno para publicaciones institucionales y redes sociales.
            <span className="ml-3 font-semibold">SÍ ☐&nbsp;&nbsp; NO ☐</span>
          </p>
          <p className="mt-1 text-[12px] text-surface-800">
            Autorizo que el alumno se retire acompañado por las personas informadas por escrito.
            <span className="ml-3 font-semibold">SÍ ☐&nbsp;&nbsp; NO ☐</span>
          </p>
          <p className="mt-2 text-[12px] text-surface-800">Personas autorizadas para retiro:</p>
          <div className="mt-1 flex flex-col gap-2 text-[12px] text-surface-800">
            {[1, 2, 3].map((n) => (
              <p key={n}>
                {n}. Nombre y Apellido <Fill min="200px" />, DNI <Fill min="120px" />, tel. <Fill min="140px" />.
              </p>
            ))}
          </div>
        </div>

        {/* Firmas */}
        <div data-block className="mt-12 flex items-end justify-between gap-8">
          <div className="flex-1 text-center">
            <div className="border-t border-surface-500" />
            <p className="mt-1 text-[12px] font-semibold text-surface-800">Firma del Padre/Tutor/Alumno</p>
            <p className="text-[11px] text-surface-600">DNI: <Fill min="120px" /></p>
            <p className="text-[11px] text-surface-600">Aclaración: <Fill min="150px" /></p>
          </div>
          <div className="flex-1 text-center">
            <div className="border-t border-surface-500" />
            <p className="mt-1 text-[12px] font-semibold text-surface-800">Silvana Verónica Jerez</p>
            <p className="text-[11px] text-surface-600">DNI: 33.890.523</p>
          </div>
        </div>
      </div>
    </div>
  )
}
