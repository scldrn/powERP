import { z } from 'zod'

function optionalTrimmedString(max: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string().max(max).optional()
  )
}

export const proveedorSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150, 'El nombre es demasiado largo'),
  contacto_nombre: optionalTrimmedString(150),
  contacto_email: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string().email('Email invalido').max(150).optional()
  ),
  contacto_tel: optionalTrimmedString(40),
  condiciones_pago: optionalTrimmedString(250),
  activo: z.boolean().default(true),
})

export type ProveedorInput = z.output<typeof proveedorSchema>
