import type { PaginatedResponse, StatusResponse, UserStatus } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * teacherService — Endpoints de /admin/teachers
 *
 * Shapes del backend (TeacherListItem / TeacherDetail DTOs).
 * Los docentes no tienen "approve" (no se auto-registran).
 * ============================================================ */

export interface TeacherListItem {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  phone: string
  courses_count: number
  status: UserStatus
  created_at: string
}

export interface TeacherDetail {
  id: string
  first_name: string
  last_name: string
  email: string
  dni: string
  phone: string
  avatar_url: string
  status: UserStatus
  join_date: string
  notes: string
  created_at: string
  updated_at: string
}

export interface CreateTeacherInput {
  email: string
  password: string
  first_name: string
  last_name: string
  dni: string
  phone: string
  join_date: string
  notes: string
}

export interface UpdateTeacherInput {
  first_name: string
  last_name: string
  dni: string
  phone: string
  join_date: string
  notes: string
}

export interface ListTeachersParams {
  search?: string
  status?: string
  page?: number
  page_size?: number
}

function buildQuery(params: ListTeachersParams): string {
  const q = new URLSearchParams()
  if (params.search) q.set('search', params.search)
  if (params.status) q.set('status', params.status)
  q.set('page', String(params.page ?? 1))
  q.set('page_size', String(params.page_size ?? 20))
  return q.toString()
}

export const teacherService = {
  list(params: ListTeachersParams = {}) {
    return httpClient.get<PaginatedResponse<TeacherListItem>>(`/admin/teachers?${buildQuery(params)}`)
  },

  getById(id: string) {
    return httpClient.get<TeacherDetail>(`/admin/teachers/${id}`)
  },

  create(data: CreateTeacherInput) {
    return httpClient.post<TeacherDetail>('/admin/teachers', data)
  },

  update(id: string, data: UpdateTeacherInput) {
    return httpClient.put<TeacherDetail>(`/admin/teachers/${id}`, data)
  },

  updateStatus(id: string, status: 'active' | 'inactive') {
    return httpClient.patch<StatusResponse>(`/admin/teachers/${id}/status`, { status })
  },
}
