'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useCreateProveedor, useUpdateProveedor, type Proveedor } from '@/lib/hooks/useProveedores'
import { proveedorSchema } from '@/lib/validations/proveedores'
import type { z } from 'zod'

type ProveedorFormInput = z.input<typeof proveedorSchema>
type ProveedorFormOutput = z.output<typeof proveedorSchema>

interface ProveedorSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proveedor: Proveedor | null
}

const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export function ProveedorSheet({ open, onOpenChange, proveedor }: ProveedorSheetProps) {
  const createProveedor = useCreateProveedor()
  const updateProveedor = useUpdateProveedor()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProveedorFormInput, unknown, ProveedorFormOutput>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      nombre: '',
      contacto_nombre: '',
      contacto_email: '',
      contacto_tel: '',
      condiciones_pago: '',
      activo: true,
    },
  })

  useEffect(() => {
    if (!open) return

    if (proveedor) {
      reset({
        nombre: proveedor.nombre,
        contacto_nombre: proveedor.contacto_nombre ?? '',
        contacto_email: proveedor.contacto_email ?? '',
        contacto_tel: proveedor.contacto_tel ?? '',
        condiciones_pago: proveedor.condiciones_pago ?? '',
        activo: proveedor.activo,
      })
      return
    }

    reset({
      nombre: '',
      contacto_nombre: '',
      contacto_email: '',
      contacto_tel: '',
      condiciones_pago: '',
      activo: true,
    })
  }, [open, proveedor, reset])

  async function onSubmit(values: ProveedorFormOutput) {
    try {
      if (proveedor) {
        await updateProveedor.mutateAsync({ id: proveedor.id, input: values })
        toast.success('Proveedor actualizado')
      } else {
        await createProveedor.mutateAsync(values)
        toast.success('Proveedor creado')
      }

      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el proveedor')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{proveedor ? 'Editar proveedor' : 'Nuevo proveedor'}</SheetTitle>
          <SheetDescription>
            Mantén al día la información de contacto y las condiciones comerciales.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Nombre *" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputCls} placeholder="Nombre del proveedor" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contacto" error={errors.contacto_nombre?.message}>
              <input {...register('contacto_nombre')} className={inputCls} placeholder="Nombre de contacto" />
            </Field>

            <Field label="Teléfono" error={errors.contacto_tel?.message}>
              <input {...register('contacto_tel')} className={inputCls} placeholder="+57 300 000 0000" />
            </Field>
          </div>

          <Field label="Correo electrónico" error={errors.contacto_email?.message}>
            <input {...register('contacto_email')} type="email" className={inputCls} placeholder="contacto@proveedor.com" />
          </Field>

          <Field label="Condiciones de pago" error={errors.condiciones_pago?.message}>
            <textarea
              {...register('condiciones_pago')}
              className={`${inputCls} min-h-[90px] resize-none`}
              placeholder="Contado, 30 días, consignación u observaciones clave"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <input type="checkbox" {...register('activo')} className="h-4 w-4 rounded border-slate-300" />
            Proveedor activo
          </label>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#6366f1] hover:bg-indigo-500"
              disabled={isSubmitting || createProveedor.isPending || updateProveedor.isPending}
            >
              {isSubmitting || createProveedor.isPending || updateProveedor.isPending ? 'Guardando...' : 'Guardar proveedor'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
