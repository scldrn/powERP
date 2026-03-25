'use client'

import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useRecibirCompra, type Compra } from '@/lib/hooks/useCompras'
import { recibirCompraSchema } from '@/lib/validations/compras'
import type { z } from 'zod'

type RecepcionFormInput = z.input<typeof recibirCompraSchema>
type RecepcionFormOutput = z.output<typeof recibirCompraSchema>

interface RecepcionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  compra: Compra | null
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value)
}

export function RecepcionSheet({ open, onOpenChange, compra }: RecepcionSheetProps) {
  const recibirCompra = useRecibirCompra()

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecepcionFormInput, unknown, RecepcionFormOutput>({
    resolver: zodResolver(recibirCompraSchema),
    defaultValues: {
      items: [],
    },
  })

  useEffect(() => {
    if (!open || !compra) return

    reset({
      items: compra.lineas.map((linea) => ({
        detalle_compra_id: linea.id,
        cantidad_recibida: linea.cantidad_pedida,
      })),
    })
  }, [compra, open, reset])

  const items = useWatch({
    control,
    name: 'items',
  })
  const totalReal = useMemo(() => {
    if (!compra) return 0

    return compra.lineas.reduce((sum, linea, index) => {
      const cantidadRecibida = Number(items?.[index]?.cantidad_recibida ?? 0)
      return sum + cantidadRecibida * Number(linea.costo_unitario ?? 0)
    }, 0)
  }, [compra, items])

  async function onSubmit(values: RecepcionFormOutput) {
    if (!compra) return

    const invalidItem = values.items.find((item, index) => {
      const linea = compra.lineas[index]
      return item.cantidad_recibida > linea.cantidad_pedida
    })

    if (invalidItem) {
      toast.error('La cantidad recibida no puede superar la cantidad pedida')
      return
    }

    try {
      await recibirCompra.mutateAsync({
        compraId: compra.id,
        input: values,
      })

      toast.success('Compra recibida correctamente')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo recibir la compra')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Recibir compra</SheetTitle>
          <SheetDescription>
            Confirma cantidades recibidas para registrar la entrada al inventario central.
          </SheetDescription>
        </SheetHeader>

        {!compra ? (
          <div className="mt-6 text-sm text-slate-500">Selecciona una compra para registrarla.</div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Proveedor</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{compra.proveedor_nombre}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Fecha</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{compra.fecha}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Total real</p>
                <p className="mt-2 text-xl font-semibold text-emerald-950">{formatCOP(totalReal)}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-medium uppercase tracking-wider text-slate-500">
                <span>Producto</span>
                <span>Pedida</span>
                <span>Recibida</span>
                <span>Subtotal</span>
              </div>

              <div className="divide-y divide-slate-100">
                {compra.lineas.map((linea, index) => (
                  <div key={linea.id} className="grid grid-cols-[1.5fr_0.7fr_0.7fr_0.8fr] gap-3 px-4 py-4 items-center">
                    <div>
                      <p className="font-medium text-slate-800">{linea.producto_nombre}</p>
                      <p className="text-xs font-mono text-slate-400">{linea.producto_codigo ?? '—'}</p>
                    </div>

                    <div className="text-sm text-slate-700">{linea.cantidad_pedida}</div>

                    <div>
                      <input
                        {...register(`items.${index}.cantidad_recibida`)}
                        type="number"
                        min="0"
                        max={linea.cantidad_pedida}
                        step="1"
                        className={inputCls}
                      />
                      <input {...register(`items.${index}.detalle_compra_id`)} type="hidden" value={linea.id} />
                      {errors.items?.[index]?.cantidad_recibida && (
                        <p className="text-xs text-red-500 mt-1">{errors.items[index]?.cantidad_recibida?.message}</p>
                      )}
                    </div>

                    <div className="text-sm font-medium text-slate-800">
                      {formatCOP(Number(items?.[index]?.cantidad_recibida ?? 0) * Number(linea.costo_unitario ?? 0))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
                disabled={isSubmitting || recibirCompra.isPending}
              >
                {isSubmitting || recibirCompra.isPending ? 'Registrando...' : 'Confirmar recepción'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
