'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { GarantiaDetalleSheet } from '@/components/admin/GarantiaDetalleSheet'
import { useGarantiasList, type GarantiaItem } from '@/lib/hooks/useGarantias'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import type { UserRol } from '@/lib/validations/usuarios'

function estadoClass(estado: string) {
  if (estado === 'abierta') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (estado === 'en_proceso') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (estado === 'resuelta') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function GarantiasTable({ rol }: { rol: UserRol }) {
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<'' | 'abierta' | 'en_proceso' | 'resuelta' | 'cerrada'>('')
  const [pdvId, setPdvId] = useState('')
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: garantias = [], isLoading } = useGarantiasList({
    estado: estado || undefined,
    pdv_id: pdvId || undefined,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
  })
  const { data: puntosDeVenta = [] } = usePuntosDeVenta()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return garantias.filter((item) => {
      if (!term) return true

      return (
        item.pdv_nombre.toLowerCase().includes(term) ||
        item.producto_nombre.toLowerCase().includes(term) ||
        (item.producto_codigo ?? '').toLowerCase().includes(term) ||
        (item.motivo ?? '').toLowerCase().includes(term)
      )
    })
  }, [garantias, search])

  const resumen = useMemo(() => {
    return filtered.reduce(
      (acc, item) => {
        acc.total += 1
        acc[item.estado as keyof typeof acc] += 1
        return acc
      },
      {
        total: 0,
        abierta: 0,
        en_proceso: 0,
        resuelta: 0,
        cerrada: 0,
      }
    )
  }, [filtered])

  const columns = useMemo<Column<GarantiaItem>[]>(() => [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item) => (
        <div>
          <p className="text-slate-700">{new Date(item.created_at).toLocaleDateString('es-CO')}</p>
          <p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleTimeString('es-CO')}</p>
        </div>
      ),
    },
    {
      key: 'pdv',
      header: 'PDV',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.pdv_nombre}</p>
          <p className="text-xs text-slate-400">{item.creador_nombre ?? 'Sin creador'}</p>
        </div>
      ),
    },
    {
      key: 'producto',
      header: 'Producto',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.producto_nombre}</p>
          <p className="text-xs font-mono text-slate-400">{item.producto_codigo ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cant.',
      render: (item) => item.cantidad,
      className: 'text-right',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${estadoClass(item.estado)}`}>
          {item.estado}
        </span>
      ),
    },
    {
      key: 'responsable',
      header: 'Responsable',
      render: (item) => item.responsable_nombre ?? 'Sin asignar',
    },
    {
      key: 'acciones',
      header: 'Acción',
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSelectedId(item.id)
            setSheetOpen(true)
          }}
        >
          {rol === 'admin' || rol === 'supervisor' ? 'Gestionar' : 'Ver detalle'}
        </Button>
      ),
    },
  ], [rol])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-5">
        <SummaryCard label="Total" value={resumen.total} />
        <SummaryCard label="Abiertas" value={resumen.abierta} />
        <SummaryCard label="En proceso" value={resumen.en_proceso} />
        <SummaryCard label="Resueltas" value={resumen.resuelta} />
        <SummaryCard label="Cerradas" value={resumen.cerrada} />
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por PDV, producto o motivo..."
          className="min-w-[240px]"
        />

        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value as typeof estado)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los estados</option>
          <option value="abierta">Abiertas</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelta">Resueltas</option>
          <option value="cerrada">Cerradas</option>
        </select>

        <select
          value={pdvId}
          onChange={(event) => setPdvId(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los PDV</option>
          {puntosDeVenta.map((pdv) => (
            <option key={pdv.id} value={pdv.id}>
              {pdv.nombre_comercial}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={fechaDesde}
          onChange={(event) => setFechaDesde(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Fecha desde"
        />

        <input
          type="date"
          value={fechaHasta}
          onChange={(event) => setFechaHasta(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          aria-label="Fecha hasta"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(item) => item.id}
        emptyMessage="No hay garantías para los filtros seleccionados"
      />

      <GarantiaDetalleSheet
        key={selectedId ?? 'empty'}
        garantiaId={selectedId}
        open={sheetOpen}
        onOpenChange={(nextOpen) => {
          setSheetOpen(nextOpen)
          if (!nextOpen) setSelectedId(null)
        }}
        rol={rol}
      />
    </div>
  )
}
