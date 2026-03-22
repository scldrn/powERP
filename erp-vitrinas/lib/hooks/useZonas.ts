import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Zona = Pick<Database['public']['Tables']['zonas']['Row'], 'id' | 'nombre'>

export function useZonas() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['zonas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('zonas').select('id, nombre').order('nombre')
      if (error) throw new Error(error.message)
      return data as Zona[]
    },
  })
}
