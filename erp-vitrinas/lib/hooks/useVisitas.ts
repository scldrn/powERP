import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type FiltrosVisitas = {
  fechaDesde?: string   // 'YYYY-MM-DD'
  fechaHasta?: string
  rutaId?: string
  colaboradoraId?: string
  estados?: string[]
}

export type VisitaAdmin = {
  id: string
  estado: string
  fecha_hora_inicio: string | null
  monto_calculado: number
  pdvNombre: string
  vitrinaCodigo: string
  rutaNombre: string
  colaboradoraNombre: string
}

// Supabase PostgREST returns joined rows as object or array — handle both
type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(val: MaybeArray<T>): T | null {
  if (val === null || val === undefined) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

export function useVisitas(filtros: FiltrosVisitas = {}) {
  const supabase = createClient()
  const hoy = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['visitas', filtros],
    queryFn: async (): Promise<VisitaAdmin[]> => {
      const desde = filtros.fechaDesde ?? hoy
      const hasta = filtros.fechaHasta ?? hoy

      let q = supabase
        .from('visitas')
        .select(`
          id, estado, fecha_hora_inicio, monto_calculado,
          puntos_de_venta(nombre_comercial),
          vitrinas(codigo),
          rutas(nombre),
          usuarios!visitas_colaboradora_id_fkey(nombre)
        `)
        .gte('created_at', `${desde}T00:00:00.000Z`)
        .lte('created_at', `${hasta}T23:59:59.999Z`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (filtros.rutaId) q = q.eq('ruta_id', filtros.rutaId)
      if (filtros.colaboradoraId) q = q.eq('colaboradora_id', filtros.colaboradoraId)
      if (filtros.estados?.length) q = q.in('estado', filtros.estados)

      const { data, error } = await q
      if (error) throw new Error(error.message)

      type RawVisita = typeof data extends (infer T)[] | null ? T : never

      const mapRow = (v: RawVisita) => {
        const pdv = v.puntos_de_venta as MaybeArray<{ nombre_comercial: string }>
        const vitrina = v.vitrinas as MaybeArray<{ codigo: string }>
        const ruta = v.rutas as MaybeArray<{ nombre: string }>
        const usuario = v.usuarios as MaybeArray<{ nombre: string }>
        return {
          id: v.id,
          estado: v.estado,
          fecha_hora_inicio: v.fecha_hora_inicio ?? null,
          monto_calculado: (v.monto_calculado as number) ?? 0,
          pdvNombre: firstOrNull(pdv)?.nombre_comercial ?? '—',
          vitrinaCodigo: firstOrNull(vitrina)?.codigo ?? '—',
          rutaNombre: firstOrNull(ruta)?.nombre ?? '—',
          colaboradoraNombre: firstOrNull(usuario)?.nombre ?? '—',
        }
      }

      return (data ?? []).map(mapRow)
    },
  })
}
