import { httpClient } from './httpClient'

/* ============================================================
 * dashboardService — Panel de control del admin
 *
 *   GET /admin/dashboard/stats?month&year
 *   GET /admin/dashboard/activity?limit
 *   GET /admin/dashboard/events?limit
 * ============================================================ */

export interface DashboardStats {
  month: number
  year: number
  active_students: number
  active_courses: number
  active_teachers: number
  collected: string // cuotas mensuales aprobadas del mes
  pending_amount: string // pending + overdue del mes (con recargo)
  other_collected: string // cargos adicionales aprobados del mes
}

export type ActivityType = 'enrollment' | 'payment_submitted' | 'payment_approved'

export interface ActivityItem {
  type: ActivityType
  at: string
  description: string
}

export interface UpcomingEventItem {
  id: string
  title: string
  type: string
  date: string
  start_time?: string
  course_name?: string
}

export const dashboardService = {
  stats(month: number, year: number) {
    return httpClient.get<DashboardStats>(`/admin/dashboard/stats?month=${month}&year=${year}`)
  },

  activity(limit = 10) {
    return httpClient.get<ActivityItem[]>(`/admin/dashboard/activity?limit=${limit}`)
  },

  events(limit = 5) {
    return httpClient.get<UpcomingEventItem[]>(`/admin/dashboard/events?limit=${limit}`)
  },
}
