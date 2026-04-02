'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDaysToDateString, getBusinessDate } from '@/lib/dates'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type ReporteVentasRow = Database['public']['Functions']['get_reporte_ventas']['Returns'][number]
type RankingVitrinasRow = Database['public']['Functions']['get_ranking_vitrinas']['Returns'][number]
type ReporteVisitasRow = Database['public']['Functions']['get_reporte_visitas']['Returns'][number]
type ReporteIncidenciasGarantiasRow =
  Database['public']['Functions']['get_reporte_incidencias_garantias']['Returns'][number]
type InventarioValorizadoRow = Database['public']['Views']['inventario_valorizado']['Row']

export type RangoFechas = {
  desde: string
  hasta: string
}

export type FiltrosReporte = RangoFechas & {
  rutaId?: string
  colaboradoraId?: string
  pdvId?: string
  productoId?: string
  tipo?: 'incidencia' | 'garantia' | ''
}

export type ReporteVentasItem = {
  pdv_nombre: string
  ruta_nombre: string
  colaboradora_nombre: string
  fecha: string
  unidades_vendidas: number
  monto_cobrado: number
  forma_pago: string
}

export type RankingVitrinaItem = {
  vitrina_id: string
  pdv_nombre: string
  ventas_actual: number
  ventas_anterior: number
  variacion_pct: number | null
}

export type ReporteVisitaItem = {
  pdv_nombre: string
  ruta_nombre: string
  colaboradora_nombre: string
  fecha_planificada: string
  estado: string
  motivo_no_realizada: string
}

export type ReporteIncidenciaGarantiaItem = {
  row_key: string
  tipo_registro: string
  pdv_nombre: string
  descripcion_o_motivo: string
  estado: string
  fecha_apertura: string
  fecha_cierre: string | null
  dias_abierta: number
}

export type ReporteInventarioItem = {
  ubicacion_tipo: string
  ubicacion_id: string | null
  ubicacion_nombre: string
  producto_id: string
  producto_codigo: string
  producto_nombre: string
  cantidad_actual: number
  costo_unitario_ref: number
  precio_venta_ref: number
  valor_costo_total: number
  valor_venta_total: number
  updated_at: string | null
}

export const DEFAULT_REPORT_RANGE: RangoFechas = {
  desde: addDaysToDateString(getBusinessDate(), -29),
  hasta: getBusinessDate(),
}

function mapReporteVentas(rows: ReporteVentasRow[] | null): ReporteVentasItem[] {
  return (rows ?? []).map((row) => ({
    pdv_nombre: row.pdv_nombre ?? '—',
    ruta_nombre: row.ruta_nombre ?? 'Sin ruta',
    colaboradora_nombre: row.colaboradora_nombre ?? 'Sin colaboradora',
    fecha: row.fecha ?? '',
    unidades_vendidas: row.unidades_vendidas ?? 0,
    monto_cobrado: row.monto_cobrado ?? 0,
    forma_pago: row.forma_pago ?? '—',
  }))
}

function mapRankingVitrinas(rows: RankingVitrinasRow[] | null): RankingVitrinaItem[] {
  return (rows ?? []).map((row) => ({
    vitrina_id: row.vitrina_id ?? '',
    pdv_nombre: row.pdv_nombre ?? '—',
    ventas_actual: row.ventas_actual ?? 0,
    ventas_anterior: row.ventas_anterior ?? 0,
    variacion_pct: row.variacion_pct ?? null,
  }))
}

function mapReporteVisitas(rows: ReporteVisitasRow[] | null): ReporteVisitaItem[] {
  return (rows ?? []).map((row) => ({
    pdv_nombre: row.pdv_nombre ?? '—',
    ruta_nombre: row.ruta_nombre ?? 'Sin ruta',
    colaboradora_nombre: row.colaboradora_nombre ?? 'Sin colaboradora',
    fecha_planificada: row.fecha_planificada ?? '',
    estado: row.estado ?? '—',
    motivo_no_realizada: row.motivo_no_realizada ?? '',
  }))
}

function mapReporteIncidenciasGarantias(
  rows: ReporteIncidenciasGarantiasRow[] | null
): ReporteIncidenciaGarantiaItem[] {
  return (rows ?? []).map((row, index) => ({
    row_key: `${row.tipo_registro ?? '—'}-${row.pdv_nombre ?? '—'}-${row.fecha_apertura ?? ''}-${index}`,
    tipo_registro: row.tipo_registro ?? '—',
    pdv_nombre: row.pdv_nombre ?? '—',
    descripcion_o_motivo: row.descripcion_o_motivo ?? '',
    estado: row.estado ?? '—',
    fecha_apertura: row.fecha_apertura ?? '',
    fecha_cierre: row.fecha_cierre ?? null,
    dias_abierta: row.dias_abierta ?? 0,
  }))
}

function mapReporteInventario(rows: InventarioValorizadoRow[] | null): ReporteInventarioItem[] {
  return (rows ?? []).map((row) => ({
    ubicacion_tipo: row.ubicacion_tipo ?? '—',
    ubicacion_id: row.ubicacion_id ?? null,
    ubicacion_nombre: row.ubicacion_nombre ?? '—',
    producto_id: row.producto_id ?? '',
    producto_codigo: row.producto_codigo ?? '—',
    producto_nombre: row.producto_nombre ?? '—',
    cantidad_actual: row.cantidad_actual ?? 0,
    costo_unitario_ref: row.costo_unitario_ref ?? 0,
    precio_venta_ref: row.precio_venta_ref ?? 0,
    valor_costo_total: row.valor_costo_total ?? 0,
    valor_venta_total: row.valor_venta_total ?? 0,
    updated_at: row.updated_at ?? null,
  }))
}

function previousPeriod(range: RangoFechas) {
  const start = new Date(`${range.desde}T00:00:00.000Z`)
  const end = new Date(`${range.hasta}T00:00:00.000Z`)
  const diffDays = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  )

  return {
    desdeAnterior: addDaysToDateString(range.desde, -diffDays),
    hastaAnterior: addDaysToDateString(range.desde, -1),
  }
}

export function useReporteVentas() {
  const [supabase] = useState(() => createClient())
  const [filtros, setFiltros] = useState<FiltrosReporte | null>(null)

  const query = useQuery({
    queryKey: ['reporte_ventas', filtros],
    enabled: Boolean(filtros),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!filtros) return []
      const { data, error } = await supabase.rpc('get_reporte_ventas', {
        p_desde: filtros.desde,
        p_hasta: filtros.hasta,
        p_ruta_id: filtros.rutaId || undefined,
        p_colaboradora_id: filtros.colaboradoraId || undefined,
        p_pdv_id: filtros.pdvId || undefined,
        p_producto_id: filtros.productoId || undefined,
      })
      if (error) throw new Error(error.message)
      return mapReporteVentas(data)
    },
  })

  return { ...query, buscar: setFiltros, filtros }
}

export function useRankingVitrinas() {
  const [supabase] = useState(() => createClient())
  const [periodo, setPeriodo] = useState<RangoFechas | null>(null)

  const query = useQuery({
    queryKey: ['reporte_ranking_vitrinas', periodo],
    enabled: Boolean(periodo),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!periodo) return []
      const anterior = previousPeriod(periodo)
      const { data, error } = await supabase.rpc('get_ranking_vitrinas', {
        p_desde_actual: periodo.desde,
        p_hasta_actual: periodo.hasta,
        p_desde_anterior: anterior.desdeAnterior,
        p_hasta_anterior: anterior.hastaAnterior,
      })
      if (error) throw new Error(error.message)
      return mapRankingVitrinas(data)
    },
  })

  return { ...query, buscar: setPeriodo, periodo }
}

export function useReporteInventario() {
  const [supabase] = useState(() => createClient())
  const [enabled, setEnabled] = useState(false)

  const query = useQuery({
    queryKey: ['reporte_inventario'],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_valorizado')
        .select('*')
        .order('ubicacion_tipo')
        .order('ubicacion_nombre')
        .order('producto_nombre')

      if (error) throw new Error(error.message)
      return mapReporteInventario(data)
    },
  })

  return { ...query, cargar: () => setEnabled(true) }
}

export function useReporteVisitas() {
  const [supabase] = useState(() => createClient())
  const [filtros, setFiltros] = useState<RangoFechas & { rutaId?: string } | null>(null)

  const query = useQuery({
    queryKey: ['reporte_visitas', filtros],
    enabled: Boolean(filtros),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!filtros) return []
      const { data, error } = await supabase.rpc('get_reporte_visitas', {
        p_desde: filtros.desde,
        p_hasta: filtros.hasta,
        p_ruta_id: filtros.rutaId || undefined,
      })
      if (error) throw new Error(error.message)
      return mapReporteVisitas(data)
    },
  })

  return { ...query, buscar: setFiltros, filtros }
}

export function useReporteIncidenciasGarantias() {
  const [supabase] = useState(() => createClient())
  const [filtros, setFiltros] = useState<FiltrosReporte | null>(null)

  const query = useQuery({
    queryKey: ['reporte_incidencias_garantias', filtros],
    enabled: Boolean(filtros),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!filtros) return []
      const { data, error } = await supabase.rpc('get_reporte_incidencias_garantias', {
        p_desde: filtros.desde,
        p_hasta: filtros.hasta,
        p_tipo: filtros.tipo || undefined,
        p_pdv_id: filtros.pdvId || undefined,
      })
      if (error) throw new Error(error.message)
      return mapReporteIncidenciasGarantias(data)
    },
  })

  return { ...query, buscar: setFiltros, filtros }
}
