import { z } from 'zod'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function emptyToUndefined(value: unknown) {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

export const lineaCompraSchema = z.object({
  producto_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Selecciona un producto valido')
  ),
  cantidad_pedida: z.coerce.number().int('La cantidad debe ser entera').min(1, 'La cantidad debe ser al menos 1'),
  costo_unitario: z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? undefined : value),
    z.coerce.number().min(0, 'El costo no puede ser negativo').optional()
  ),
})

export const crearCompraSchema = z.object({
  proveedor_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid('Selecciona un proveedor valido')
  ),
  fecha: z.preprocess(
    emptyToUndefined,
    z.string().regex(DATE_RE, 'Selecciona una fecha valida')
  ),
  notas: z.preprocess(
    emptyToUndefined,
    z.string().max(1000, 'Las notas no pueden superar los 1000 caracteres').optional()
  ),
  lineas: z.array(lineaCompraSchema).min(1, 'Agrega al menos un producto'),
}).superRefine((values, ctx) => {
  const seen = new Set<string>()

  values.lineas.forEach((linea, index) => {
    if (seen.has(linea.producto_id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No repitas productos dentro de la misma orden',
        path: ['lineas', index, 'producto_id'],
      })
      return
    }

    seen.add(linea.producto_id)
  })
})

export const recibirCompraItemSchema = z.object({
  detalle_compra_id: z.string().uuid('Detalle de compra invalido'),
  cantidad_recibida: z.coerce.number().int('La cantidad debe ser entera').min(0, 'La cantidad no puede ser negativa'),
})

export const recibirCompraSchema = z.object({
  items: z.array(recibirCompraItemSchema).min(1, 'No hay lineas para recibir'),
})

export type LineaCompraInput = z.output<typeof lineaCompraSchema>
export type CrearCompraInput = z.output<typeof crearCompraSchema>
export type RecibirCompraItemInput = z.output<typeof recibirCompraItemSchema>
export type RecibirCompraInput = z.output<typeof recibirCompraSchema>
