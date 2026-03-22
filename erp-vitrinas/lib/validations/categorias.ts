import { z } from 'zod'

export const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
})

export type CategoriaFormValues = z.infer<typeof categoriaSchema>
