import { Route } from 'react-router-dom'
import { RouteError } from '@/components/RouteError'
import { TeacherLayout } from '@/components/layout/teacher/TeacherLayout'
import { TeacherHomePage } from '@/features/teacher/home/TeacherHomePage'
import { TeacherAttendancePage } from '@/features/teacher/attendance/TeacherAttendancePage'
import { TeacherGradesPage } from '@/features/teacher/grades/TeacherGradesPage'
import { TeacherCalendarPage } from '@/features/teacher/calendar/TeacherCalendarPage'
import { TeacherNotificationsPage } from '@/features/teacher/notifications/TeacherNotificationsPage'
import { TeacherSettingsPage } from '@/features/teacher/settings/TeacherSettingsPage'

export function teacherRoutes() {
  return (
    <Route element={<TeacherLayout />}>
      {/* Ruta sin path con errorElement: al estar DENTRO del layout, si una
          pantalla revienta el error se renderiza en el <Outlet> y el menu
          lateral queda en pie (M8-01). */}
      <Route errorElement={<RouteError />}>
      <Route index element={<TeacherHomePage />} />
      <Route path="inicio" element={<TeacherHomePage />} />
      <Route path="asistencia" element={<TeacherAttendancePage />} />
      <Route path="notas" element={<TeacherGradesPage />} />
      <Route path="calendario" element={<TeacherCalendarPage />} />
      <Route path="notificaciones" element={<TeacherNotificationsPage />} />
      <Route path="configuracion" element={<TeacherSettingsPage />} />
    </Route>
    </Route>
  )
}
