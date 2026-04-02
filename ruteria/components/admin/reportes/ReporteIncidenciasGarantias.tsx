'use client'

import { useState } from 'react'
import { Download, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/admin/DataTable'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  useReporteIncidenciasGarantias,
  type ReporteIncidenciaGarantiaItem,
} from '@/lib/hooks/useReportes'
import { downloadReporteXlsx } from '@/lib/utils/exportXlsx'
import { FiltrosReporte } from './FiltrosReporte'

function estadoClass(estado: string) {
  if (estado === 'abierta' || estado === 'en_analisis' || estado === 'en_proceso') {
    return 'bg-amber-100 text-amber-700'
  }
  if (estado === 'resuelta' || estado === 'cerrada') return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

export function ReporteIncidenciasGarantias() {
  const { data = [], isLoading, buscar, filtros } = useReporteIncidenciasGarantias()
  const [confirmExport, setConfirmExport] = useState(false)

  const columns: Column<ReporteIncidenciaGarantiaItem>[] = [
    { key: 'tipo_registro', header: 'Tipo', render: (item) => item.tipo_registro },
    { key: 'pdv_nombre', header: 'PDV', render: (item) => item.pdv_nombre },
    {
      key: 'descripcion_o_motivo',
      header: 'Descripción / motivo',
      render: (item) => (
        <div className="max-w-[360px]">
          <p className="truncate">{item.descripcion_o_motivo || '—'}</p>
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item) => (
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${estadoClass(item.estado)}`}>
          {item.estado}
        </span>
      ),
    },
    { key: 'fecha_apertura', header: 'Apertura', render: (item) => item.fecha_apertura || '—' },
    { key: 'fecha_cierre', header: 'Cierre', render: (item) => item.fecha_cierre || '—' },
    {
      key: 'dias_abierta',
      header: 'Días abierta',
      className: 'text-right',
      render: (item) => item.dias_abierta.toLocaleString('es-CO'),
    },
  ]

  async function doExport() {
    if (!filtros) return

    try {
      await downloadReporteXlsx('incidencias', filtros)
      setConfirmExport(false)
      toast.success('Reporte exportado')
    } catch {
      toast.error('No se pudo exportar el reporte')
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        <FiltrosReporte onBuscar={buscar} isLoading={isLoading} showPdv showTipo />

        <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_-50px_rgba(15,23,42,0.6)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Casos</p>
              <p className="text-sm text-slate-500">Cruza incidencias y garantías para medir presión operativa.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Casos abiertos</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">
                {data.filter((item) => !item.fecha_cierre).length.toLocaleString('es-CO')}
              </p>
            </div>

            {data.length > 0 && (
              <Button
                variant="outline"
                onClick={() => (data.length > 5000 ? setConfirmExport(true) : void doExport())}
                className="rounded-xl"
              >
                <Download size={16} />
                Exportar .xlsx
              </Button>
            )}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        getRowKey={(row) => row.row_key}
        emptyMessage="Aplica filtros para consultar incidencias y garantías."
      />

      <AlertDialog open={confirmExport} onOpenChange={setConfirmExport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exportar {data.length.toLocaleString('es-CO')} filas</AlertDialogTitle>
            <AlertDialogDescription>
              El archivo puede tardar unos segundos en generarse. ¿Quieres continuar con la descarga?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doExport}>Exportar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
