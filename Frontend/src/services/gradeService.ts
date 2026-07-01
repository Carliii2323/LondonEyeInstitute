import type { StatusResponse } from '@/types'
import { httpClient } from './httpClient'

/* ============================================================
 * gradeService — Notas
 *
 *   Admin/teacher:
 *     GET /admin/grades?course_id&year   -> notas + recuperatorios del curso
 *     PUT /admin/grades                   -> guardar (upsert)
 *   Alumno:
 *     GET /student/grades                 -> mis notas (todos los cursos)
 *
 * Modelo (alineado a la planilla): por termino (1=Julio, 2=Diciembre)
 * una nota por skill (R/L/S/W) + un make-up por termino.
 * ============================================================ */

export type Term = 1 | 2

export interface GradeRow {
  student_id: string
  first_name: string
  last_name: string
  dni: string
  year: number
  term: number
  reading: number | null
  listening: number | null
  speaking: number | null
  writing: number | null
}

export interface MakeupRow {
  student_id: string
  first_name?: string
  last_name?: string
  dni?: string
  course_name?: string
  year: number
  term: number
  score: number
  taken_at: string
}

export interface GradesResponse {
  grades: GradeRow[]
  makeups: MakeupRow[]
}

export interface StudentGradeRow {
  course_id: string
  course_name: string
  year: number
  term: number
  reading: number | null
  listening: number | null
  speaking: number | null
  writing: number | null
}

export interface StudentGradesResponse {
  grades: StudentGradeRow[]
  makeups: MakeupRow[]
}

export interface UpsertGradeItem {
  student_id: string
  term: Term
  reading: number | null
  listening: number | null
  speaking: number | null
  writing: number | null
}

export interface UpsertMakeupItem {
  student_id: string
  term: Term
  score: number
  taken_at?: string
}

export interface SaveGradesInput {
  course_id: string
  year: number
  grades: UpsertGradeItem[]
  makeups: UpsertMakeupItem[]
}

/** 'admin' usa /admin/grades; 'teacher' usa /teacher/grades (mismo shape, con ownership). */
export type GradeScope = 'admin' | 'teacher'

export const gradeService = {
  getByCourse(courseId: string, year: number, scope: GradeScope = 'admin') {
    return httpClient.get<GradesResponse>(`/${scope}/grades?course_id=${courseId}&year=${year}`)
  },

  save(input: SaveGradesInput, scope: GradeScope = 'admin') {
    return httpClient.put<StatusResponse>(`/${scope}/grades`, input)
  },

  getMine() {
    return httpClient.get<StudentGradesResponse>('/student/grades')
  },
}
