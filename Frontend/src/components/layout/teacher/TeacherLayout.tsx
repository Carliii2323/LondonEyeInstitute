import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/uiStore'
import { TeacherSidebar } from './TeacherSidebar'
import { Header } from '@/components/layout/Header'

export function TeacherLayout() {
  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen)

  return (
    <div className="min-h-screen bg-surface-50">
      <TeacherSidebar />
      <div className={cn('transition-[margin-left] duration-200 ease-in-out', isSidebarOpen ? 'ml-64' : 'ml-16')}>
        <Header />
        <main className="p-6"><Outlet /></main>
      </div>
    </div>
  )
}