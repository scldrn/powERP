'use client'

import { VisitasTable } from '@/components/admin/VisitasTable'

export default function VisitasPage() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Visitas</h1>
      <VisitasTable />
    </main>
  )
}
