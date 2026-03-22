'use client'

import { useState } from 'react'
import { DataTable } from '@/components/admin/DataTable'
import type { Column } from '@/components/admin/DataTable'
import { Badge } from '@/components/ui/badge'
import { useVisitas } from '@/lib/hooks/useVisitas'
import type { VisitaAdmin } from '@/lib/hooks/useVisitas'
import { useRutas } from '@/lib/hooks/useRutas'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'

// Configuración visual de estados
const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  planificada:  { label: 'Planificada',  className: 'bg-slate-100 text-slate-700 border-slate-200' },
  en_ejecucion: { label: 'En ejecución', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  completada:   { label: 'Completada',   className: 'bg-green-100 text-green-700 border-green-200' },
  no_realizada: { label: 'No realizada', className: 'bg-red-100 text-red-700 border-red-200' },
}

const COLUMNAS: Column<VisitaAdmin>[] = [
  {
    key: 'fecha',
    header: 'Fecha',
    render: (row) => {
      if (!row.fecha_hora_inicio) return <span className="text-slate-400">—</span>
      const d = new Date(row.fecha_hora_inicio)
      return (
        <span className="text-slate-700">
          {d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          {' '}
          <span className="text-slate-400 text-xs">
            {d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </span>
      )
    },
  },
  {
    key: 'ruta',
    header: 'Ruta',
    render: (row) => <span className="text-slate-700">{row.rutaNombre}</span>,
  },
  {
    key: 'colaboradora',
    header: 'Colaboradora',
    render: (row) => <span className="text-slate-700">{row.colaboradoraNombre}</span>,
  },
  {
    key: 'pdv',
    header: 'PDV',
    render: (row) => <span className="text-slate-700">{row.pdvNombre}</span>,
  },
  {
    key: 'vitrina',
    header: 'Vitrina',
    render: (row) => (
      <span className="font-mono text-xs text-slate-600">{row.vitrinaCodigo}</span>
    ),
  },
  {
    key: 'estado',
    header: 'Estado',
    render: (row) => {
      const cfg = ESTADO_CONFIG[row.estado] ?? { label: row.estado, className: 'bg-slate-100 text-slate-700' }
      return (
        <Badge className={cfg.className}>
          {cfg.label}
        </Badge>
      )
    },
  },
  {
    key: 'monto',
    header: 'Monto',
    className: 'text-right',
    render: (row) => (
      <span className="text-slate-700 font-medium tabular-nums">
        {row.monto_calculado.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
      </span>
    ),
  },
]

function toDateInput(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function VisitasTable() {
  const hoy = toDateInput(new Date())

  const [fechaDesde, setFechaDesde] = useState(hoy)
  const [fechaHasta, setFechaHasta] = useState(hoy)
  const [rutaId, setRutaId] = useState('')
  const [colaboradoraId, setColaboradoraId] = useState('')

  const { data: visitas = [], isLoading } = useVisitas({
    fechaDesde,
    fechaHasta,
    rutaId: rutaId || undefined,
    colaboradoraId: colaboradoraId || undefined,
  })

  const { data: rutas = [] } = useRutas()
  const { data: colaboradoras = [] } = useColaboradoras()

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Desde
          </label>
          <input
            type="date"
            value={fechaDesde}
            max={fechaHasta}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Hasta
          </label>
          <input
            type="date"
            value={fechaHasta}
            min={fechaDesde}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Ruta
          </label>
          <select
            value={rutaId}
            onChange={(e) => setRutaId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          >
            <option value="">Todas las rutas</option>
            {rutas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Colaboradora
          </label>
          <select
            value={colaboradoraId}
            onChange={(e) => setColaboradoraId(e.target.value)}
            className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          >
            <option value="">Todas</option>
            {colaboradoras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Contador de resultados */}
        {!isLoading && (
          <span className="ml-auto self-end text-xs text-slate-400 pb-1">
            {visitas.length} visita{visitas.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tabla */}
      <DataTable
        columns={COLUMNAS}
        data={visitas}
        isLoading={isLoading}
        getRowKey={(row) => row.id}
        emptyMessage="No hay visitas para el período seleccionado"
      />
    </div>
  )
}
