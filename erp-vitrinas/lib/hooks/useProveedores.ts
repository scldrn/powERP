import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { ProveedorInput } from '@/lib/validations/proveedores'

export type Proveedor = Database['public']['Tables']['proveedores']['Row']

const QUERY_KEY = ['proveedores'] as const

export function useProveedores() {
  const supabase = createClient()

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<Proveedor[]> => {
      const { data, error } = await supabase.from('proveedores').select('*').order('nombre')
      if (error) throw new Error(error.message)
      return (data ?? []) as Proveedor[]
    },
  })
}

export function useCreateProveedor() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProveedorInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { error } = await supabase.from('proveedores').insert({
        ...input,
        created_by: user?.id ?? null,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useUpdateProveedor() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string
      input: ProveedorInput
    }) => {
      const { error } = await supabase.from('proveedores').update(input).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
