import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useZonas() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['zonas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zonas').select('id, nombre').order('nombre')
      if (error) throw new Error(error.message)
      return data
    },
  })
}
