'use client'

import { useEffect } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRegistrarGarantia, useSurtidoVitrina } from '@/lib/hooks/useGarantias'
import { registrarGarantiaSchema } from '@/lib/validations/garantias'
import type { z } from 'zod'

type GarantiaFormInput = z.input<typeof registrarGarantiaSchema>
type GarantiaFormOutput = z.output<typeof registrarGarantiaSchema>

interface GarantiaSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  visitaId: string
  pdvId: string
  vitrinaId: string
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function GarantiaSheet({
  open,
  onOpenChange,
  visitaId,
  pdvId,
  vitrinaId,
}: GarantiaSheetProps) {
  const { data: surtido = [], isLoading: isLoadingSurtido } = useSurtidoVitrina(vitrinaId)
  const registrarGarantia = useRegistrarGarantia({ visitaId, pdvId, vitrinaId })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GarantiaFormInput, unknown, GarantiaFormOutput>({
    resolver: zodResolver(registrarGarantiaSchema),
    defaultValues: {
      producto_id: '',
      cantidad: 1,
      motivo: '',
      fecha_venta_aprox: '',
    },
  })

  useEffect(() => {
    if (!open) return
    reset({
      producto_id: '',
      cantidad: 1,
      motivo: '',
      fecha_venta_aprox: '',
    })
  }, [open, reset])

  async function onSubmit(values: GarantiaFormOutput) {
    try {
      const result = await registrarGarantia.mutateAsync(values)

      if (result.pendingOffline) {
        toast.success('Garantía guardada en este dispositivo. Se sincronizara al reconectar.')
      } else {
        toast.success('Garantía registrada correctamente')
      }

      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la garantía')
    }
  }

  const canSubmit = surtido.length > 0 && !isLoadingSurtido

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar garantía</SheetTitle>
          <SheetDescription>
            Registra productos devueltos por defecto o falla detectada durante la visita.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-700">
              <ShieldAlert size={16} />
            </div>
            <div>
              <p className="font-medium text-amber-900">Devolución por garantía</p>
              <p className="text-sm text-amber-800">
                El producto se descuenta de la vitrina y queda listo para seguimiento administrativo.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Producto *</label>
            <select {...register('producto_id')} className={inputCls} disabled={isLoadingSurtido || surtido.length === 0}>
              <option value="">
                {isLoadingSurtido ? 'Cargando surtido...' : surtido.length === 0 ? 'Sin productos en surtido' : 'Seleccionar producto...'}
              </option>
              {surtido.map((item) => (
                <option key={item.producto_id} value={item.producto_id}>
                  {item.productos?.nombre ?? item.producto_id}
                  {item.productos?.codigo ? ` (${item.productos.codigo})` : ''}
                </option>
              ))}
            </select>
            {errors.producto_id && <p className="text-xs text-red-500 mt-1">{errors.producto_id.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cantidad *</label>
            <input
              {...register('cantidad')}
              type="number"
              min="1"
              step="1"
              className={inputCls}
              placeholder="1"
            />
            {errors.cantidad && <p className="text-xs text-red-500 mt-1">{errors.cantidad.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Motivo *</label>
            <textarea
              {...register('motivo')}
              className={`${inputCls} min-h-[110px] resize-none`}
              placeholder="Describe el defecto, falla o motivo de la devolución"
            />
            {errors.motivo && <p className="text-xs text-red-500 mt-1">{errors.motivo.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha aproximada de venta</label>
            <input {...register('fecha_venta_aprox')} type="date" className={inputCls} />
            {errors.fecha_venta_aprox && (
              <p className="text-xs text-red-500 mt-1">{errors.fecha_venta_aprox.message}</p>
            )}
          </div>

          {!canSubmit && !isLoadingSurtido && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Esta vitrina no tiene surtido estándar configurado. No es posible registrar garantías todavía.
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={!canSubmit || isSubmitting || registrarGarantia.isPending}
            >
              {isSubmitting || registrarGarantia.isPending ? 'Guardando...' : 'Registrar garantía'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
