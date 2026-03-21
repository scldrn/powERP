import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { ProductoFormValues } from '@/lib/validations/productos'

type Producto = Database['public']['Tables']['productos']['Row'] & {
  categorias: { nombre: string } | null
}

const QUERY_KEY = ['productos'] as const

export function useProductos() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('nombre')
      if (error) throw new Error(error.message)
      return data as Producto[]
    },
  })
}

export function useCreateProducto() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: ProductoFormValues) => {
      const { error } = await supabase.from('productos').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateProducto() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ProductoFormValues> }) => {
      const { error } = await supabase.from('productos').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useToggleProductoEstado() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: 'activo' | 'inactivo' }) => {
      const { error } = await supabase.from('productos').update({ estado }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, estado }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<Producto[]>(QUERY_KEY)
      queryClient.setQueryData<Producto[]>(QUERY_KEY, (old) =>
        old?.map((p) => (p.id === id ? { ...p, estado } : p))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
