'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { CompraSheet } from '@/components/admin/CompraSheet'
import { RecepcionSheet } from '@/components/admin/RecepcionSheet'
import {
  useCancelarCompra,
  useCompras,
  useConfirmarCompra,
  type Compra,
} from '@/lib/hooks/useCompras'
import type { UserRol } from '@/lib/validations/usuarios'

function formatCOP(value: number | null): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function estadoClass(estado: string) {
  if (estado === 'pendiente') return 'bg-amber-100 text-amber-800'
  if (estado === 'confirmada') return 'bg-blue-100 text-blue-800'
  if (estado === 'recibida') return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-700'
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function ComprasClient({ rol }: { rol: UserRol }) {
  const { data: compras = [], isLoading } = useCompras()
  const confirmarCompra = useConfirmarCompra()
  const cancelarCompra = useCancelarCompra()
  const canManage = rol === 'admin' || rol === 'compras'
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [recepcionOpen, setRecepcionOpen] = useState(false)
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return compras.filter((compra) => {
      const matchesSearch =
        !term ||
        compra.proveedor_nombre.toLowerCase().includes(term) ||
        compra.lineas.some((linea) => linea.producto_nombre.toLowerCase().includes(term))

      const matchesEstado = !estado || compra.estado === estado

      return matchesSearch && matchesEstado
    })
  }, [compras, estado, search])

  const resumen = useMemo(() => ({
    total: compras.length,
    pendientes: compras.filter((item) => item.estado === 'pendiente').length,
    confirmadas: compras.filter((item) => item.estado === 'confirmada').length,
    recibidas: compras.filter((item) => item.estado === 'recibida').length,
  }), [compras])

  async function handleConfirmar(compraId: string) {
    try {
      await confirmarCompra.mutateAsync(compraId)
      toast.success('Compra confirmada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo confirmar la compra')
    }
  }

  async function handleCancelar(compraId: string) {
    try {
      await cancelarCompra.mutateAsync(compraId)
      toast.success('Compra cancelada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar la compra')
    }
  }

  const baseColumns: Column<Compra>[] = [
    {
      key: 'fecha',
      header: 'Fecha',
      render: (item) => item.fecha,
    },
    {
      key: 'proveedor',
      header: 'Proveedor',
      render: (item) => (
        <div>
          <p className="font-medium text-slate-800">{item.proveedor_nombre}</p>
          <p className="text-xs text-slate-400">{item.lineas.length} línea(s)</p>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${estadoClass(item.estado)}`}>
          {item.estado}
        </span>
      ),
    },
    {
      key: 'estimado',
      header: 'Estimado',
      render: (item) => formatCOP(item.total_estimado),
      className: 'text-right',
    },
    {
      key: 'real',
      header: 'Real',
      render: (item) => formatCOP(item.total_real),
      className: 'text-right',
    },
  ]

  const columns: Column<Compra>[] = canManage
    ? [
        ...baseColumns,
        {
          key: 'acciones',
          header: 'Acciones',
          render: (item) => (
            <div className="flex flex-wrap gap-2">
              {item.estado === 'pendiente' && (
                <Button type="button" variant="outline" size="sm" onClick={() => handleConfirmar(item.id)}>
                  Confirmar
                </Button>
              )}

              {item.estado === 'confirmada' && (
                <Button
                  type="button"
                  size="sm"
                  className="bg-[#6366f1] hover:bg-indigo-500"
                  onClick={() => {
                    setSelectedCompra(item)
                    setRecepcionOpen(true)
                  }}
                >
                  Recibir
                </Button>
              )}

              {(item.estado === 'pendiente' || item.estado === 'confirmada') && (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleCancelar(item.id)}>
                  Cancelar
                </Button>
              )}
            </div>
          ),
        },
      ]
    : baseColumns

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Compras</h1>
          <p className="text-sm text-slate-500 mt-1">
            Crea órdenes, confírmalas y registra la recepción para alimentar el inventario central.
          </p>
        </div>
        {canManage && (
          <Button className="bg-[#6366f1] hover:bg-indigo-500" onClick={() => setSheetOpen(true)}>
            <Plus size={16} className="mr-1.5" /> Nueva compra
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Total" value={resumen.total} />
        <SummaryCard label="Pendientes" value={resumen.pendientes} />
        <SummaryCard label="Confirmadas" value={resumen.confirmadas} />
        <SummaryCard label="Recibidas" value={resumen.recibidas} />
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por proveedor o producto..."
          className="min-w-[240px]"
        />

        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="confirmada">Confirmadas</option>
          <option value="recibida">Recibidas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(item) => item.id}
        emptyMessage="No hay compras para los filtros seleccionados"
      />

      {canManage && (
        <>
          <CompraSheet open={sheetOpen} onOpenChange={setSheetOpen} />
          <RecepcionSheet open={recepcionOpen} onOpenChange={setRecepcionOpen} compra={selectedCompra} />
        </>
      )}
    </div>
  )
}
