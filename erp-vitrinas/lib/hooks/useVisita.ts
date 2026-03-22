import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type ItemConteo = {
  productoId: string
  nombre: string
  precioUnitario: number
  invAnterior: number
  invActual: number | null        // null = no ingresado aún
  unidadesVendidas: number        // calculado live: max(invAnterior - invActual, 0)
  subtotal: number                // live: unidadesVendidas * precioUnitario
}

export type VisitaDetalle = {
  id: string
  estado: 'planificada' | 'en_ejecucion' | 'completada' | 'no_realizada'
  fecha_hora_inicio: string | null
  monto_calculado: number
  pdvNombre: string
  vitrinaCodigo: string
  items: ItemConteo[]
}

// Supabase PostgREST returns joined rows as object or array — handle both
type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(val: MaybeArray<T>): T | null {
  if (val === null || val === undefined) return null
  return Array.isArray(val) ? (val[0] ?? null) : val
}

function calcItem(
  productoId: string,
  nombre: string,
  precio: number,
  invAnterior: number,
  invActual: number | null
): ItemConteo {
  const vendidas = invActual !== null ? Math.max(invAnterior - invActual, 0) : 0
  return {
    productoId,
    nombre,
    precioUnitario: precio,
    invAnterior,
    invActual,
    unidadesVendidas: vendidas,
    subtotal: vendidas * precio,
  }
}

export function useVisita(id: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['visita', id],
    enabled: !!id,
    queryFn: async (): Promise<VisitaDetalle> => {
      // Query 1: datos de la visita
      const { data: visita, error: vErr } = await supabase
        .from('visitas')
        .select('id, estado, fecha_hora_inicio, monto_calculado, vitrina_id, puntos_de_venta(nombre_comercial), vitrinas(codigo)')
        .eq('id', id)
        .single()
      if (vErr || !visita) throw new Error(vErr?.message ?? 'Visita no encontrada')

      const vitrinaId = visita.vitrina_id

      // Queries 2-4 en paralelo
      const [surtidoRes, inventarioRes, detalleRes] = await Promise.all([
        supabase
          .from('surtido_estandar')
          .select('producto_id, cantidad_objetivo, productos(id, nombre, precio_venta_comercio)')
          .eq('vitrina_id', vitrinaId),
        supabase
          .from('inventario_vitrina')
          .select('producto_id, cantidad_actual')
          .eq('vitrina_id', vitrinaId),
        supabase
          .from('detalle_visita')
          .select('producto_id, inv_anterior, inv_actual')
          .eq('visita_id', id),
      ])

      if (surtidoRes.error) throw new Error(surtidoRes.error.message)

      const inventarioMap = new Map(
        (inventarioRes.data ?? []).map((iv) => [iv.producto_id, iv.cantidad_actual])
      )
      const detalleMap = new Map(
        (detalleRes.data ?? []).map((d) => [d.producto_id, d])
      )

      type ProdRaw = { id: string; nombre: string; precio_venta_comercio: number }

      const items: ItemConteo[] = (surtidoRes.data ?? []).map((se) => {
        const prod = firstOrNull(
          se.productos as MaybeArray<ProdRaw>
        )
        if (!prod) return null

        const invAnterior = inventarioMap.get(prod.id) ?? 0
        const detalle = detalleMap.get(prod.id)
        const invActual = detalle ? detalle.inv_actual : null

        return calcItem(prod.id, prod.nombre, prod.precio_venta_comercio, invAnterior, invActual)
      }).filter((item): item is ItemConteo => item !== null)

      const pdvRaw = visita.puntos_de_venta as MaybeArray<{ nombre_comercial: string }>
      const vitrRaw = visita.vitrinas as MaybeArray<{ codigo: string }>

      return {
        id: visita.id,
        estado: visita.estado as VisitaDetalle['estado'],
        fecha_hora_inicio: visita.fecha_hora_inicio ?? null,
        monto_calculado: (visita.monto_calculado as number) ?? 0,
        pdvNombre: firstOrNull(pdvRaw)?.nombre_comercial ?? '',
        vitrinaCodigo: firstOrNull(vitrRaw)?.codigo ?? '',
        items,
      }
    },
  })

  const iniciarVisita = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('visitas')
        .update({ estado: 'en_ejecucion', fecha_hora_inicio: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const guardarConteo = useMutation({
    mutationFn: async (items: ItemConteo[]) => {
      const rows = items.map((item) => ({
        visita_id: id,
        producto_id: item.productoId,
        inv_anterior: item.invAnterior,
        inv_actual: item.invActual ?? 0,
        precio_unitario: item.precioUnitario,
        unidades_repuestas: 0,
      }))

      const { error } = await supabase
        .from('detalle_visita')
        .upsert(rows, {
          onConflict: 'visita_id,producto_id',
          ignoreDuplicates: false,
        })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  const marcarNoRealizada = useMutation({
    mutationFn: async (motivo: string) => {
      if (!motivo.trim()) throw new Error('El motivo es requerido')
      const { error } = await supabase
        .from('visitas')
        .update({ estado: 'no_realizada', motivo_no_realizada: motivo.trim() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visita', id] })
      queryClient.invalidateQueries({ queryKey: ['ruta-del-dia'] })
    },
  })

  return { ...query, iniciarVisita, guardarConteo, marcarNoRealizada }
}
