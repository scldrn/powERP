import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getBusinessDayUtcRange } from '@/lib/dates'
import { useSurtidoEstandar } from '@/lib/hooks/useSurtidoEstandar'
import { isProbablyOfflineError } from '@/lib/offline/network'
import { enqueueCreateGarantia } from '@/lib/offline/queue'
import type { Database } from '@/lib/supabase/database.types'
import type {
  FiltrosGarantias,
  RegistrarGarantiaInput,
  ResolverGarantiaInput,
} from '@/lib/validations/garantias'

type MaybeArray<T> = T | T[] | null

function firstOrNull<T>(value: MaybeArray<T>): T | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export type GarantiaItem = Database['public']['Tables']['garantias']['Row'] & {
  producto_nombre: string
  producto_codigo: string | null
  pdv_nombre: string
  responsable_nombre: string | null
  creador_nombre: string | null
}

const QUERY_KEY = ['garantias'] as const

function normalizeGarantia(
  item: Database['public']['Tables']['garantias']['Row'] & {
    productos?: MaybeArray<{ nombre: string; codigo: string }>
    puntos_de_venta?: MaybeArray<{ nombre_comercial: string }>
    responsable?: MaybeArray<{ nombre: string }>
    creador?: MaybeArray<{ nombre: string }>
  }
): GarantiaItem {
  const producto = firstOrNull(item.productos ?? null)
  const pdv = firstOrNull(item.puntos_de_venta ?? null)
  const responsable = firstOrNull(item.responsable ?? null)
  const creador = firstOrNull(item.creador ?? null)

  return {
    ...item,
    producto_nombre: producto?.nombre ?? '—',
    producto_codigo: producto?.codigo ?? null,
    pdv_nombre: pdv?.nombre_comercial ?? '—',
    responsable_nombre: responsable?.nombre ?? null,
    creador_nombre: creador?.nombre ?? null,
  }
}

export function useGarantiasList(filtros: FiltrosGarantias = {}) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...QUERY_KEY, filtros],
    queryFn: async (): Promise<GarantiaItem[]> => {
      let query = supabase
        .from('garantias')
        .select(`
          *,
          productos(nombre, codigo),
          puntos_de_venta(nombre_comercial),
          responsable:usuarios!garantias_responsable_id_fkey(nombre),
          creador:usuarios!garantias_created_by_fkey(nombre)
        `)
        .order('created_at', { ascending: false })

      if (filtros.estado) {
        query = query.eq('estado', filtros.estado)
      }

      if (filtros.pdv_id) {
        query = query.eq('pdv_id', filtros.pdv_id)
      }

      if (filtros.fecha_desde) {
        const { start } = getBusinessDayUtcRange(filtros.fecha_desde)
        query = query.gte('created_at', start)
      }

      if (filtros.fecha_hasta) {
        const { end } = getBusinessDayUtcRange(filtros.fecha_hasta)
        query = query.lt('created_at', end)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)

      return (data ?? []).map((item) => normalizeGarantia(item as never))
    },
  })
}

export function useGarantiaDetalle(id: string | null) {
  const supabase = createClient()

  return useQuery({
    queryKey: [...QUERY_KEY, 'detalle', id],
    enabled: !!id,
    queryFn: async (): Promise<GarantiaItem | null> => {
      if (!id) return null

      const { data, error } = await supabase
        .from('garantias')
        .select(`
          *,
          productos(nombre, codigo),
          puntos_de_venta(nombre_comercial),
          responsable:usuarios!garantias_responsable_id_fkey(nombre),
          creador:usuarios!garantias_created_by_fkey(nombre)
        `)
        .eq('id', id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) return null

      return normalizeGarantia(data as never)
    },
  })
}

export function useSurtidoVitrina(vitrinaId: string) {
  const { data = [], isLoading, error } = useSurtidoEstandar(vitrinaId)

  return {
    data,
    isLoading,
    error,
  }
}

export function useRegistrarGarantia({
  visitaId,
  pdvId,
  vitrinaId,
}: {
  visitaId: string
  pdvId: string
  vitrinaId: string
}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RegistrarGarantiaInput) => {
      const garantiaId = crypto.randomUUID()

      try {
        const { error } = await supabase.rpc('registrar_garantia', {
          p_garantia_id: garantiaId,
          p_visita_recepcion_id: visitaId,
          p_pdv_id: pdvId,
          p_producto_id: input.producto_id,
          p_cantidad: input.cantidad,
          p_motivo: input.motivo,
          p_fecha_venta_aprox: input.fecha_venta_aprox ?? undefined,
        })

        if (error) throw new Error(error.message)
      } catch (error) {
        if (!isProbablyOfflineError(error)) {
          throw error
        }

        await enqueueCreateGarantia(visitaId, {
          garantia_id: garantiaId,
          pdv_id: pdvId,
          vitrina_id: vitrinaId,
          producto_id: input.producto_id,
          cantidad: input.cantidad,
          motivo: input.motivo,
          fecha_venta_aprox: input.fecha_venta_aprox ?? null,
        })

        return {
          garantiaId,
          pendingOffline: true,
        }
      }

      return {
        garantiaId,
        pendingOffline: false,
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['visita'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_vitrina'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_valorizado'] })
    },
  })
}

export function useAsignarResponsable() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      garantiaId,
      responsableId,
    }: {
      garantiaId: string
      responsableId: string
    }) => {
      const { error } = await supabase
        .from('garantias')
        .update({
          responsable_id: responsableId,
          estado: 'en_proceso',
          updated_at: new Date().toISOString(),
        })
        .eq('id', garantiaId)

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}

export function useResolverGarantia() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      garantiaId,
      input,
    }: {
      garantiaId: string
      input: ResolverGarantiaInput
    }) => {
      const { error } = await supabase.rpc('resolver_garantia', {
        p_garantia_id: garantiaId,
        p_resolucion: input.resolucion,
        p_notas: input.notas_resolucion ?? undefined,
      })

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['inventario_central'] })
      queryClient.invalidateQueries({ queryKey: ['movimientos_inventario'] })
      queryClient.invalidateQueries({ queryKey: ['inventario_valorizado'] })
    },
  })
}

export function useCerrarGarantia() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (garantiaId: string) => {
      const { error } = await supabase
        .from('garantias')
        .update({
          estado: 'cerrada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', garantiaId)
        .eq('estado', 'resuelta')

      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
  })
}
