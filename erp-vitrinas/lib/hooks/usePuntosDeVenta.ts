import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { PuntoDeVentaFormValues } from '@/lib/validations/puntos-de-venta'

type PuntoDeVenta = Database['public']['Tables']['puntos_de_venta']['Row'] & {
  zonas: { nombre: string } | null
}

const QUERY_KEY = ['puntos_de_venta'] as const

export function usePuntosDeVenta() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('puntos_de_venta')
        .select('*, zonas(nombre)')
        .order('nombre_comercial')
      if (error) throw new Error(error.message)
      return data as PuntoDeVenta[]
    },
  })
}

export function useCreatePuntoDeVenta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: PuntoDeVentaFormValues) => {
      const { error } = await supabase.from('puntos_de_venta').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdatePuntoDeVenta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<PuntoDeVentaFormValues> }) => {
      const { error } = await supabase.from('puntos_de_venta').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
