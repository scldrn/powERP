import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { createUsuarioAction, updateUsuarioAction } from '@/app/actions/usuarios'
import type { UsuarioCreateValues, UsuarioUpdateValues } from '@/lib/validations/usuarios'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const QUERY_KEY = ['usuarios'] as const

export function useUsuarios() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('usuarios').select('*').order('nombre')
      if (error) throw new Error(error.message)
      return data as Usuario[]
    },
  })
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: UsuarioCreateValues) => {
      const result = await createUsuarioAction(values)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UsuarioUpdateValues }) => {
      const result = await updateUsuarioAction(id, values)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
