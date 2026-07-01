import { Route } from 'react-router-dom'
import { AdminLayout } from '@/components/layout/admin/AdminLayout'

import { DashboardPage } from '@/features/admin/dashboard/DashboardPage'
import { StudentsPage } from '@/features/admin/students/StudentsPage'
import { CoursesPage } from '@/features/admin/courses/CoursesPage'
import { TeachersPage } from '@/features/admin/teachers/TeachersPage'
import { PaymentsHistoryPage } from '@/features/admin/payments/PaymentsHistoryPage'
import { PaymentReviewPage } from '@/features/admin/payments/PaymentReviewPage'
import { PaymentReviewsHistoryPage } from '@/features/admin/payments/PaymentReviewsHistoryPage'
import { CalendarPage } from '@/features/admin/calendar/CalendarPage'
import { AttendancePage } from '@/features/admin/attendance/AttendancePage'
import { GradesPage } from '@/features/admin/grades/GradesPage'
import { NotificationsPage } from '@/features/admin/notifications/NotificationsPage'
import { CertificatesPage } from '@/features/admin/certificates/CertificatesPage'
import { SettingsPage } from '@/features/admin/settings/SettingsPage'
import { AdminProfilePage } from '@/features/admin/profile/AdminProfilePage'

/* ============================================================
 * AdminRoutes — Todas las rutas del panel de administracion
 *
 * Se monta bajo /admin/* en el router principal.
 * ============================================================ */

export function adminRoutes() {
  return (
    <Route element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="estudiantes" element={<StudentsPage />} />
      <Route path="cursos" element={<CoursesPage />} />
      <Route path="docentes" element={<TeachersPage />} />
      <Route path="pagos/historial" element={<PaymentsHistoryPage />} />
      <Route path="pagos/revision" element={<PaymentReviewPage />} />
      <Route path="pagos/revisiones" element={<PaymentReviewsHistoryPage />} />
      <Route path="calendario" element={<CalendarPage />} />
      <Route path="asistencia" element={<AttendancePage />} />
      <Route path="notas" element={<GradesPage />} />
      <Route path="notificaciones" element={<NotificationsPage />} />
      <Route path="certificados" element={<CertificatesPage />} />
      <Route path="configuracion" element={<SettingsPage />} />
      <Route path="perfil" element={<AdminProfilePage />} />
    </Route>
  )
}