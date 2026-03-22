import { z } from 'zod'

export const productoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  categoria_id: z.string().uuid('Selecciona una categoría'),
  descripcion: z.string().optional(),
  costo_compra: z.number().min(0, 'El costo no puede ser negativo'),
  precio_venta_comercio: z.number().min(0, 'El precio no puede ser negativo'),
  unidad_medida: z.string().min(1, 'La unidad es requerida'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
}).refine(
  (d) => d.precio_venta_comercio >= d.costo_compra,
  {
    message: 'El precio de venta debe ser mayor o igual al costo de compra',
    path: ['precio_venta_comercio'],
  }
)

export type ProductoFormValues = z.infer<typeof productoSchema>
