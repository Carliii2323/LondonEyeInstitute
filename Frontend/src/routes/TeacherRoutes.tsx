import { Route } from 'react-router-dom'
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
      <Route index element={<TeacherHomePage />} />
      <Route path="inicio" element={<TeacherHomePage />} />
      <Route path="asistencia" element={<TeacherAttendancePage />} />
      <Route path="notas" element={<TeacherGradesPage />} />
      <Route path="calendario" element={<TeacherCalendarPage />} />
      <Route path="notificaciones" element={<TeacherNotificationsPage />} />
      <Route path="configuracion" element={<TeacherSettingsPage />} />
    </Route>
  )
}
