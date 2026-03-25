'use client'

import { useMemo, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { ProveedorSheet } from '@/components/admin/ProveedorSheet'
import { useProveedores, type Proveedor } from '@/lib/hooks/useProveedores'
import type { UserRol } from '@/lib/validations/usuarios'

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export function ProveedoresClient({ rol }: { rol: UserRol }) {
  const { data: proveedores = [], isLoading } = useProveedores()
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selected, setSelected] = useState<Proveedor | null>(null)
  const canManage = rol === 'admin' || rol === 'compras'

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    return proveedores.filter((proveedor) => {
      const matchesSearch =
        !term ||
        proveedor.nombre.toLowerCase().includes(term) ||
        (proveedor.contacto_nombre ?? '').toLowerCase().includes(term) ||
        (proveedor.contacto_email ?? '').toLowerCase().includes(term)

      const matchesEstado =
        estado === 'todos' ||
        (estado === 'activos' && proveedor.activo) ||
        (estado === 'inactivos' && !proveedor.activo)

      return matchesSearch && matchesEstado
    })
  }, [estado, proveedores, search])

  const resumen = useMemo(() => ({
    total: proveedores.length,
    activos: proveedores.filter((item) => item.activo).length,
    inactivos: proveedores.filter((item) => !item.activo).length,
  }), [proveedores])

  const columns = useMemo<Column<Proveedor>[]>(() => {
    const baseColumns: Column<Proveedor>[] = [
      {
        key: 'nombre',
        header: 'Proveedor',
        render: (item) => (
          <div>
            <p className="font-medium text-slate-800">{item.nombre}</p>
            <p className="text-xs text-slate-400">{item.contacto_nombre ?? 'Sin contacto principal'}</p>
          </div>
        ),
      },
      {
        key: 'contacto',
        header: 'Contacto',
        render: (item) => (
          <div>
            <p>{item.contacto_email ?? '—'}</p>
            <p className="text-xs text-slate-400">{item.contacto_tel ?? '—'}</p>
          </div>
        ),
      },
      {
        key: 'condiciones',
        header: 'Condiciones',
        render: (item) => item.condiciones_pago ?? '—',
      },
      {
        key: 'estado',
        header: 'Estado',
        render: (item) => (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            item.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {item.activo ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
    ]

    if (!canManage) return baseColumns

    return [
      ...baseColumns,
      {
        key: 'acciones',
        header: '',
        render: (item) => (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Editar proveedor ${item.nombre}`}
            onClick={() => {
              setSelected(item)
              setSheetOpen(true)
            }}
          >
            <Pencil size={14} />
          </Button>
        ),
        className: 'w-12',
      },
    ]
  }, [canManage])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Proveedores</h1>
          <p className="text-sm text-slate-500 mt-1">Gestión de contactos, condiciones y disponibilidad comercial.</p>
        </div>
        {canManage && (
          <Button
            className="bg-[#6366f1] hover:bg-indigo-500"
            onClick={() => {
              setSelected(null)
              setSheetOpen(true)
            }}
          >
            <Plus size={16} className="mr-1.5" /> Nuevo proveedor
          </Button>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total" value={resumen.total} />
        <SummaryCard label="Activos" value={resumen.activos} />
        <SummaryCard label="Inactivos" value={resumen.inactivos} />
      </div>

      <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-lg p-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por proveedor o contacto..."
          className="min-w-[240px]"
        />

        <select
          value={estado}
          onChange={(event) => setEstado(event.target.value as typeof estado)}
          className="h-9 rounded-md border border-slate-200 px-3 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="todos">Todos</option>
          <option value="activos">Solo activos</option>
          <option value="inactivos">Solo inactivos</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(item) => item.id}
        emptyMessage="No hay proveedores para los filtros seleccionados"
      />

      {canManage && (
        <ProveedorSheet open={sheetOpen} onOpenChange={setSheetOpen} proveedor={selected} />
      )}
    </div>
  )
}
