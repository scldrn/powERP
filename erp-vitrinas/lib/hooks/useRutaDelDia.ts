import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type VisitaDelDia = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  fecha_hora_fin: string | null
  monto_calculado: number
  motivo_no_realizada: string | null
  pdv: { nombre_comercial: string; direccion: string | null }
  ruta: { nombre: string }
  orden_visita: number
}

const SELECT = `
  id,
  estado,
  fecha_hora_inicio,
  fecha_hora_fin,
  monto_calculado,
  motivo_no_realizada,
  puntos_de_venta(nombre_comercial, direccion),
  rutas(nombre),
  rutas_pdv!inner(orden_visita)
` as const

type RawVisita = {
  id: string
  estado: string
  fecha_hora_inicio: string | null
  fecha_hora_fin: string | null
  monto_calculado: number
  motivo_no_realizada: string | null
  puntos_de_venta: { nombre_comercial: string; direccion: string | null } | { nombre_comercial: string; direccion: string | null }[] | null
  rutas: { nombre: string } | { nombre: string }[] | null
  rutas_pdv: { orden_visita: number } | { orden_visita: number }[] | null
}

function mapRow(v: RawVisita): VisitaDelDia {
  const pdvRaw = v.puntos_de_venta
  const pdv: VisitaDelDia['pdv'] = Array.isArray(pdvRaw)
    ? (pdvRaw[0] ?? { nombre_comercial: '', direccion: null })
    : (pdvRaw ?? { nombre_comercial: '', direccion: null })

  const rutaRaw = v.rutas
  const ruta: VisitaDelDia['ruta'] = Array.isArray(rutaRaw)
    ? (rutaRaw[0] ?? { nombre: '' })
    : (rutaRaw ?? { nombre: '' })

  const rutaPdvRaw = v.rutas_pdv
  const rutaPdv = Array.isArray(rutaPdvRaw) ? rutaPdvRaw[0] : rutaPdvRaw

  return {
    id: v.id,
    estado: v.estado as VisitaDelDia['estado'],
    fecha_hora_inicio: v.fecha_hora_inicio ?? null,
    fecha_hora_fin: v.fecha_hora_fin ?? null,
    monto_calculado: v.monto_calculado ?? 0,
    motivo_no_realizada: v.motivo_no_realizada ?? null,
    pdv,
    ruta,
    orden_visita: rutaPdv?.orden_visita ?? 0,
  }
}

export function useRutaDelDia() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['ruta-del-dia'],
    queryFn: async (): Promise<VisitaDelDia[]> => {
      const hoy = new Date().toISOString().split('T')[0]

      const [planificadas, activas] = await Promise.all([
        supabase
          .from('visitas')
          .select(SELECT)
          .eq('estado', 'planificada')
          .gte('created_at', `${hoy}T00:00:00.000Z`)
          .lte('created_at', `${hoy}T23:59:59.999Z`),
        supabase
          .from('visitas')
          .select(SELECT)
          .in('estado', ['en_ejecucion', 'completada', 'no_realizada'])
          .not('fecha_hora_inicio', 'is', null)
          .gte('fecha_hora_inicio', `${hoy}T00:00:00.000Z`)
          .lte('fecha_hora_inicio', `${hoy}T23:59:59.999Z`),
      ])

      if (planificadas.error) throw new Error(planificadas.error.message)
      if (activas.error) throw new Error(activas.error.message)

      return [
        ...(planificadas.data ?? []).map((v) => mapRow(v as unknown as RawVisita)),
        ...(activas.data ?? []).map((v) => mapRow(v as unknown as RawVisita)),
      ].sort((a, b) => a.orden_visita - b.orden_visita)
    },
  })
}
