import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const ESTADOS_GARANTIA = ['abierta', 'en_proceso', 'resuelta', 'cerrada'] as const
export const RESOLUCIONES_GARANTIA = ['cambio', 'baja', 'devolucion_proveedor'] as const

export const registrarGarantiaSchema = z.object({
  producto_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Selecciona un producto valido')
  ),
  cantidad: z.coerce.number().int('La cantidad debe ser entera').min(1, 'La cantidad debe ser al menos 1'),
  motivo: z.string().trim().min(1, 'El motivo es obligatorio').max(1000, 'El motivo es demasiado largo'),
  fecha_venta_aprox: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_RE, 'Selecciona una fecha valida').optional()
  ),
})

export const resolverGarantiaSchema = z.object({
  resolucion: z.enum(RESOLUCIONES_GARANTIA, {
    errorMap: () => ({ message: 'Selecciona una resolucion valida' }),
  }),
  notas_resolucion: z.preprocess(
    emptyToUndefined,
    z.string().max(1000, 'Las notas no pueden superar los 1000 caracteres').optional()
  ),
})

export const filtrosGarantiasSchema = z.object({
  estado: z.preprocess(
    emptyToUndefined,
    z.enum(ESTADOS_GARANTIA, {
      errorMap: () => ({ message: 'Selecciona un estado valido' }),
    }).optional()
  ),
  pdv_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Selecciona un PDV valido').optional()
  ),
  fecha_desde: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_RE, 'Selecciona una fecha valida').optional()
  ),
  fecha_hasta: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_RE, 'Selecciona una fecha valida').optional()
  ),
}).superRefine((values, ctx) => {
  if (values.fecha_desde && values.fecha_hasta && values.fecha_desde > values.fecha_hasta) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'La fecha desde no puede ser mayor que la fecha hasta',
      path: ['fecha_desde'],
    })
  }
})

export type RegistrarGarantiaInput = z.output<typeof registrarGarantiaSchema>
export type ResolverGarantiaInput = z.output<typeof resolverGarantiaSchema>
export type FiltrosGarantias = z.output<typeof filtrosGarantiasSchema>
