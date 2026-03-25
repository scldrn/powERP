'use client'

import { useEffect, useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCrearCompra } from '@/lib/hooks/useCompras'
import { useProductos } from '@/lib/hooks/useProductos'
import { useProveedores } from '@/lib/hooks/useProveedores'
import { crearCompraSchema } from '@/lib/validations/compras'
import { getBusinessDate } from '@/lib/dates'
import type { z } from 'zod'

type CompraFormInput = z.input<typeof crearCompraSchema>
type CompraFormOutput = z.output<typeof crearCompraSchema>

interface CompraSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
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

export function CompraSheet({ open, onOpenChange }: CompraSheetProps) {
  const { data: proveedores = [] } = useProveedores()
  const { data: productos = [] } = useProductos()
  const crearCompra = useCrearCompra()

  const productosActivos = useMemo(() => productos.filter((item) => item.estado === 'activo'), [productos])
  const proveedoresActivos = useMemo(() => proveedores.filter((item) => item.activo), [proveedores])

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CompraFormInput, unknown, CompraFormOutput>({
    resolver: zodResolver(crearCompraSchema),
    defaultValues: {
      proveedor_id: '',
      fecha: getBusinessDate(),
      notas: '',
      lineas: [{ producto_id: '', cantidad_pedida: 1, costo_unitario: undefined }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineas',
  })

  useEffect(() => {
    if (!open) return

    reset({
      proveedor_id: '',
      fecha: getBusinessDate(),
      notas: '',
      lineas: [{ producto_id: '', cantidad_pedida: 1, costo_unitario: undefined }],
    })
  }, [open, reset])

  const lineas = useWatch({
    control,
    name: 'lineas',
  })
  const totalEstimado = useMemo(
    () =>
      (lineas ?? []).reduce((sum, linea) => {
        return sum + Number(linea.cantidad_pedida ?? 0) * Number(linea.costo_unitario ?? 0)
      }, 0),
    [lineas]
  )

  async function onSubmit(values: CompraFormOutput) {
    try {
      await crearCompra.mutateAsync(values)
      toast.success('Orden de compra creada')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear la compra')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva orden de compra</SheetTitle>
          <SheetDescription>
            Registra la orden con proveedor, fecha y líneas de producto. El inventario entra al recibirla.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor *</label>
              <select {...register('proveedor_id')} className={inputCls}>
                <option value="">Seleccionar proveedor...</option>
                {proveedoresActivos.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>
                    {proveedor.nombre}
                  </option>
                ))}
              </select>
              {errors.proveedor_id && <p className="text-xs text-red-500 mt-1">{errors.proveedor_id.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
              <input {...register('fecha')} type="date" className={inputCls} />
              {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notas</label>
            <textarea
              {...register('notas')}
              className={`${inputCls} min-h-[90px] resize-none`}
              placeholder="Factura, condiciones acordadas o contexto de la orden"
            />
            {errors.notas && <p className="text-xs text-red-500 mt-1">{errors.notas.message}</p>}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="font-medium text-slate-800">Líneas de compra</p>
                <p className="text-sm text-slate-500">Define cantidades pedidas y costo estimado por producto.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ producto_id: '', cantidad_pedida: 1, costo_unitario: undefined })}
              >
                <Plus size={14} /> Agregar línea
              </Button>
            </div>

            <div className="space-y-4 p-4">
              {fields.map((field, index) => {
                const selectedIds = (lineas ?? [])
                  .map((linea, lineaIndex) => (lineaIndex === index ? null : linea.producto_id))
                  .filter(Boolean)

                return (
                  <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1.7fr_0.8fr_1fr_auto]">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Producto *</label>
                      <select {...register(`lineas.${index}.producto_id`)} className={inputCls}>
                        <option value="">Seleccionar producto...</option>
                        {productosActivos.map((producto) => (
                          <option
                            key={producto.id}
                            value={producto.id}
                            disabled={selectedIds.includes(producto.id)}
                          >
                            {producto.nombre} ({producto.codigo})
                          </option>
                        ))}
                      </select>
                      {errors.lineas?.[index]?.producto_id && (
                        <p className="text-xs text-red-500 mt-1">{errors.lineas[index]?.producto_id?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Cant. *</label>
                      <input
                        {...register(`lineas.${index}.cantidad_pedida`)}
                        type="number"
                        min="1"
                        step="1"
                        className={inputCls}
                      />
                      {errors.lineas?.[index]?.cantidad_pedida && (
                        <p className="text-xs text-red-500 mt-1">{errors.lineas[index]?.cantidad_pedida?.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Costo unitario</label>
                      <input
                        {...register(`lineas.${index}.costo_unitario`)}
                        type="number"
                        min="0"
                        step="0.01"
                        className={inputCls}
                        placeholder="0"
                      />
                      {errors.lineas?.[index]?.costo_unitario && (
                        <p className="text-xs text-red-500 mt-1">{errors.lineas[index]?.costo_unitario?.message}</p>
                      )}
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-slate-500"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {typeof errors.lineas?.message === 'string' && (
                <p className="text-xs text-red-500">{errors.lineas.message}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-indigo-700">Total estimado</p>
            <p className="mt-1 text-2xl font-semibold text-indigo-950">{formatCOP(totalEstimado)}</p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={isSubmitting || crearCompra.isPending}
            >
              {isSubmitting || crearCompra.isPending ? 'Guardando...' : 'Crear orden'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
