import { Route } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { StudentLayout } from '@/components/layout/student/StudentLayout'
import { StudentHomePage } from '@/features/student/home/StudentHomePage'
import { StudentPaymentsPage } from '@/features/student/payments/StudentPaymentsPage'
import { StudentCalendarPage } from '@/features/student/calendar/StudentCalendarPage'
import { StudentAttendancePage } from '@/features/student/attendance/StudentAttendancePage'
import { StudentNotificationsPage } from '@/features/student/notifications/StudentNotificationsPage'
import { StudentLibretaPage } from '@/features/student/certificates/StudentLibretaPage'
import { StudentContractPage } from '@/features/student/contract/StudentContractPage'
import { StudentSettingsPage } from '@/features/student/settings/StudentSettingsPage'

export function studentRoutes() {
  return (
    <Route element={<StudentLayout />}>
      {/* Ruta sin path con errorElement: al estar DENTRO del layout, si una
          pantalla revienta el error se renderiza en el <Outlet> y el menu
          lateral queda en pie (M8-01). */}
      <Route errorElement={<RouteError />}>
      <Route index element={<StudentHomePage />} />
      <Route path="inicio" element={<StudentHomePage />} />
      <Route path="pagos" element={<StudentPaymentsPage />} />
      <Route path="calendario" element={<StudentCalendarPage />} />
      <Route path="asistencia" element={<StudentAttendancePage />} />
      <Route path="notificaciones" element={<StudentNotificationsPage />} />
      <Route path="libreta" element={<StudentLibretaPage />} />
      <Route path="contrato" element={<StudentContractPage />} />
      <Route path="configuracion" element={<StudentSettingsPage />} />
    </Route>
    </Route>
  )
}
