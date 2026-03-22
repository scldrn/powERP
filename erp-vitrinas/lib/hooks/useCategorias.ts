import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { CategoriaFormValues } from '@/lib/validations/categorias'

type Categoria = Database['public']['Tables']['categorias']['Row']

const QUERY_KEY = ['categorias'] as const

export function useCategorias() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nombre')
      if (error) throw new Error(error.message)
      return data as Categoria[]
    },
  })
}

// Solo categorías activas — para selects en formularios
export function useCategoriasActivas() {
  const supabase = createClient()
  return useQuery({
    queryKey: [...QUERY_KEY, 'activas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CategoriaFormValues) => {
      const { error } = await supabase.from('categorias').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<CategoriaFormValues> }) => {
      const { error } = await supabase.from('categorias').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
