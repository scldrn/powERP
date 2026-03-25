'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  useAsignarResponsable,
  useCerrarGarantia,
  useGarantiaDetalle,
  useResolverGarantia,
} from '@/lib/hooks/useGarantias'
import { useUsuarios } from '@/lib/hooks/useUsuarios'
import { resolverGarantiaSchema } from '@/lib/validations/garantias'
import type { UserRol } from '@/lib/validations/usuarios'
import type { z } from 'zod'

type ResolverFormInput = z.input<typeof resolverGarantiaSchema>
type ResolverFormOutput = z.output<typeof resolverGarantiaSchema>

interface GarantiaDetalleSheetProps {
  garantiaId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  rol: UserRol
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function InfoCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-2 text-sm font-medium text-slate-800">{value}</div>
    </div>
  )
}

function estadoClass(estado: string) {
  if (estado === 'abierta') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (estado === 'en_proceso') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (estado === 'resuelta') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  )
}

export function GarantiaDetalleSheet({
  garantiaId,
  open,
  onOpenChange,
  rol,
}: GarantiaDetalleSheetProps) {
  const { data: garantia, isLoading } = useGarantiaDetalle(open ? garantiaId : null)
  const { data: usuarios = [] } = useUsuarios()
  const asignarResponsable = useAsignarResponsable()
  const resolverGarantia = useResolverGarantia()
  const cerrarGarantia = useCerrarGarantia()
  const canManage = rol === 'admin' || rol === 'supervisor'
  const [responsableId, setResponsableId] = useState<string | null>(null)

  const responsables = useMemo(
    () =>
      usuarios.filter(
        (usuario) => usuario.activo && ['admin', 'supervisor', 'compras'].includes(usuario.rol)
      ),
    [usuarios]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResolverFormInput, unknown, ResolverFormOutput>({
    resolver: zodResolver(resolverGarantiaSchema),
    defaultValues: {
      resolucion: undefined,
      notas_resolucion: '',
    },
  })

  useEffect(() => {
    if (!open || !garantia) return

    reset({
      resolucion: undefined,
      notas_resolucion: garantia.notas_resolucion ?? '',
    })
  }, [garantia, open, reset])

  async function handleAsignarResponsable() {
    const selectedResponsableId = responsableId ?? garantia?.responsable_id ?? ''

    if (!garantia || !selectedResponsableId) {
      toast.error('Selecciona un responsable antes de asignar')
      return
    }

    try {
      await asignarResponsable.mutateAsync({
        garantiaId: garantia.id,
        responsableId: selectedResponsableId,
      })

      setResponsableId(selectedResponsableId)
      toast.success('Responsable asignado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo asignar el responsable')
    }
  }

  async function onResolver(values: ResolverFormOutput) {
    if (!garantia) return

    try {
      await resolverGarantia.mutateAsync({
        garantiaId: garantia.id,
        input: values,
      })

      toast.success('Garantía resuelta')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo resolver la garantía')
    }
  }

  async function handleCerrarGarantia() {
    if (!garantia) return

    try {
      await cerrarGarantia.mutateAsync(garantia.id)
      toast.success('Garantía cerrada')
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la garantía')
    }
  }

  const selectedResponsableId = responsableId ?? garantia?.responsable_id ?? ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalle de garantía</SheetTitle>
          <SheetDescription>
            Revisa el caso, asigna responsable y define la resolución administrativa.
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="mt-6 text-sm text-slate-500">Cargando garantía...</div>
        ) : !garantia ? (
          <div className="mt-6 text-sm text-slate-500">Selecciona una garantía para ver su detalle.</div>
        ) : (
          <div className="space-y-5 mt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard label="PDV" value={garantia.pdv_nombre} />
              <InfoCard
                label="Producto"
                value={
                  <div>
                    <p>{garantia.producto_nombre}</p>
                    <p className="text-xs font-mono text-slate-500">{garantia.producto_codigo ?? '—'}</p>
                  </div>
                }
              />
              <InfoCard label="Cantidad" value={garantia.cantidad} />
              <InfoCard
                label="Estado"
                value={
                  <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${estadoClass(garantia.estado)}`}>
                    {garantia.estado}
                  </span>
                }
              />
              <InfoCard label="Creada por" value={garantia.creador_nombre ?? '—'} />
              <InfoCard label="Responsable" value={garantia.responsable_nombre ?? 'Sin asignar'} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Motivo</p>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{garantia.motivo || 'Sin detalle'}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoCard
                label="Fecha aproximada de venta"
                value={garantia.fecha_venta_aprox ?? 'No registrada'}
              />
              <InfoCard
                label="Resolución actual"
                value={garantia.resolucion ?? 'Pendiente de definir'}
              />
            </div>

            {garantia.notas_resolucion && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Notas de resolución</p>
                <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{garantia.notas_resolucion}</p>
              </div>
            )}

            {canManage && garantia.estado === 'abierta' && (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">Asignar responsable y pasar a en proceso</p>
                <Field label="Responsable">
                  <select
                    name="responsable_id"
                    value={selectedResponsableId}
                    onChange={(event) => setResponsableId(event.target.value)}
                    className={inputCls}
                  >
                    <option value="">Seleccionar responsable...</option>
                    {responsables.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} ({usuario.rol})
                      </option>
                    ))}
                  </select>
                </Field>

                <Button
                  type="button"
                  variant="outline"
                  disabled={asignarResponsable.isPending}
                  onClick={handleAsignarResponsable}
                >
                  {asignarResponsable.isPending ? 'Asignando...' : 'Asignar responsable'}
                </Button>
              </div>
            )}

            {canManage && ['abierta', 'en_proceso'].includes(garantia.estado) && (
              <form onSubmit={handleSubmit(onResolver)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-medium text-slate-800">Resolver garantía</p>

                <Field label="Resolución">
                  <select {...register('resolucion')} className={inputCls}>
                    <option value="">Seleccionar resolución...</option>
                    <option value="cambio">Cambio y reingreso a central</option>
                    <option value="baja">Baja definitiva</option>
                    <option value="devolucion_proveedor">Devolución a proveedor</option>
                  </select>
                  {errors.resolucion && <p className="text-xs text-red-500 mt-1">{errors.resolucion.message}</p>}
                </Field>

                <Field label="Notas de resolución">
                  <textarea
                    {...register('notas_resolucion')}
                    className={`${inputCls} min-h-[110px] resize-none`}
                    placeholder="Detalles de la decisión tomada"
                  />
                  {errors.notas_resolucion && (
                    <p className="text-xs text-red-500 mt-1">{errors.notas_resolucion.message}</p>
                  )}
                </Field>

                <Button
                  type="submit"
                  className="bg-[#6366f1] hover:bg-indigo-500"
                  disabled={isSubmitting || resolverGarantia.isPending}
                >
                  {isSubmitting || resolverGarantia.isPending ? 'Resolviendo...' : 'Resolver garantía'}
                </Button>
              </form>
            )}

            {canManage && garantia.estado === 'resuelta' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-medium text-emerald-900">Caso listo para cierre</p>
                <p className="mt-1 text-sm text-emerald-800">
                  La resolución ya fue aplicada. Cierra la garantía cuando la revisión administrativa esté completa.
                </p>
                <Button
                  type="button"
                  className="mt-4 bg-emerald-600 hover:bg-emerald-500"
                  disabled={cerrarGarantia.isPending}
                  onClick={handleCerrarGarantia}
                >
                  {cerrarGarantia.isPending ? 'Cerrando...' : 'Cerrar garantía'}
                </Button>
              </div>
            )}

            {!canManage && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Tu rol tiene acceso de solo lectura sobre este módulo.
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
