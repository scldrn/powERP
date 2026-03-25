import { test, expect, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { getBusinessDate, getBusinessDayUtcRange } from '../lib/dates'

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

let adminId: string
let colaboradoraId: string
let pdvId: string
let vitrinaId: string
let rutaId: string
let producto1Id: string

async function loginAdmin(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('admin@erp.local')
  await page.getByLabel(/contraseña/i).fill('Admin1234!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/admin/dashboard')
}

async function loginColaboradora(page: Page) {
  await page.goto('/login')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
  })
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel(/correo/i).fill('colaboradora@erp.local')
  await page.getByLabel(/contraseña/i).fill('Colab1234!')
  await page.getByRole('button', { name: /iniciar sesión/i }).click()
  await page.waitForURL('/campo/ruta-del-dia')
}

async function resetInventarioBase() {
  await adminSupabase
    .from('inventario_central')
    .update({ cantidad_actual: 50, fecha_actualizacion: new Date().toISOString() })
    .eq('producto_id', producto1Id)

  await adminSupabase
    .from('inventario_vitrina')
    .update({ cantidad_actual: 10, fecha_actualizacion: new Date().toISOString() })
    .eq('vitrina_id', vitrinaId)
    .eq('producto_id', producto1Id)
}

async function createVisita() {
  const hoy = getBusinessDate()
  const { start, end } = getBusinessDayUtcRange(hoy)

  const { data: visitasHoy } = await adminSupabase
    .from('visitas')
    .select('id')
    .eq('pdv_id', pdvId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  const visitaIds = visitasHoy?.map((row) => row.id) ?? []

  if (visitaIds.length > 0) {
    const { data: garantias } = await adminSupabase
      .from('garantias')
      .select('id')
      .in('visita_recepcion_id', visitaIds)

    const garantiaIds = garantias?.map((item) => item.id) ?? []

    if (garantiaIds.length > 0) {
      await adminSupabase.from('movimientos_inventario').delete().in('referencia_id', garantiaIds)
      await adminSupabase.from('garantias').delete().in('id', garantiaIds)
    }

    await adminSupabase.from('movimientos_inventario').delete().in('referencia_id', visitaIds)
    await adminSupabase.from('cobros').delete().in('visita_id', visitaIds)
    await adminSupabase.from('detalle_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('fotos_visita').delete().in('visita_id', visitaIds)
    await adminSupabase.from('incidencias').delete().in('visita_id', visitaIds)
  }

  await adminSupabase
    .from('visitas')
    .delete()
    .eq('pdv_id', pdvId)
    .eq('colaboradora_id', colaboradoraId)
    .gte('created_at', start)
    .lt('created_at', end)

  const { data: visita } = await adminSupabase
    .from('visitas')
    .insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      vitrina_id: vitrinaId,
      colaboradora_id: colaboradoraId,
      estado: 'planificada',
    })
    .select('id')
    .single()

  if (!visita) throw new Error('No se pudo crear la visita de prueba')
  return visita.id
}

test.beforeAll(async () => {
  const { data: admin } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'admin')
    .limit(1)
    .single()
  if (!admin) throw new Error('No se encontró admin de prueba')
  adminId = admin.id

  const { data: colab } = await adminSupabase
    .from('usuarios')
    .select('id')
    .eq('rol', 'colaboradora')
    .limit(1)
    .single()
  if (!colab) throw new Error('No se encontró colaboradora de prueba')
  colaboradoraId = colab.id

  const { data: pdv } = await adminSupabase
    .from('puntos_de_venta')
    .select('id')
    .eq('codigo', 'PDV-001')
    .single()
  pdvId = pdv!.id

  const { data: vitrina } = await adminSupabase
    .from('vitrinas')
    .select('id')
    .eq('codigo', 'VIT-001')
    .single()
  vitrinaId = vitrina!.id

  const { data: ruta } = await adminSupabase
    .from('rutas')
    .select('id')
    .eq('colaboradora_id', colaboradoraId)
    .limit(1)
    .maybeSingle()

  if (ruta) {
    rutaId = ruta.id
  } else {
    const { data: nuevaRuta } = await adminSupabase
      .from('rutas')
      .insert({
        codigo: 'RUT-TEST-S7',
        nombre: 'Ruta Test Sprint 7',
        colaboradora_id: colaboradoraId,
        dias_visita: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
        estado: 'activa',
      })
      .select('id')
      .single()

    rutaId = nuevaRuta!.id

    await adminSupabase.from('rutas_pdv').insert({
      ruta_id: rutaId,
      pdv_id: pdvId,
      orden_visita: 1,
    })
  }

  const { data: producto } = await adminSupabase
    .from('productos')
    .select('id')
    .eq('codigo', 'PRD-001')
    .single()
  producto1Id = producto!.id
})

test.beforeEach(async () => {
  await resetInventarioBase()
})

test('colaboradora registra garantía y admin la resuelve con cambio', async ({ page }) => {
  const visitaId = await createVisita()
  const motivo = `Garantia E2E ${Date.now()}`
  let garantiaId: string | null = null

  await loginColaboradora(page)
  await page.goto(`/campo/visita/${visitaId}`)
  await page.getByRole('button', { name: /iniciar visita/i }).click()

  await page.getByRole('button', { name: /registrar garantía/i }).click()
  await expect(page.getByRole('heading', { name: /registrar garantía/i })).toBeVisible()

  await page.locator('select[name="producto_id"]').selectOption(producto1Id)
  await page.locator('input[name="cantidad"]').fill('1')
  await page.locator('textarea[name="motivo"]').fill(motivo)
  await page.getByRole('button', { name: /registrar garantía/i }).last().click()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('garantias')
        .select('id')
        .eq('visita_recepcion_id', visitaId)
        .eq('motivo', motivo)
        .maybeSingle()

      garantiaId = data?.id ?? null
      return garantiaId
    })
    .not.toBeNull()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('movimientos_inventario')
        .select('id')
        .eq('referencia_tipo', 'garantia')
        .eq('referencia_id', garantiaId as string)
        .eq('tipo', 'devolucion_garantia')
        .maybeSingle()

      return data?.id ?? null
    })
    .not.toBeNull()

  await loginAdmin(page)
  await page.goto('/admin/garantias')
  await expect(page.getByRole('heading', { name: /garantías/i })).toBeVisible()

  await page.getByLabel(/buscar por pdv, producto o motivo/i).fill(motivo)
  await page.waitForTimeout(350)
  await page.getByRole('button', { name: /gestionar/i }).click()
  await expect(page.getByRole('heading', { name: /detalle de garantía/i })).toBeVisible()

  await page.locator('select[name="responsable_id"]').selectOption(adminId)
  await page.getByRole('button', { name: /asignar responsable/i }).click()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('garantias')
        .select('estado, responsable_id')
        .eq('id', garantiaId as string)
        .single()

      return `${data?.estado}:${data?.responsable_id}`
    })
    .toBe(`en_proceso:${adminId}`)

  await page.locator('select[name="resolucion"]').selectOption('cambio')
  await page.locator('textarea[name="notas_resolucion"]').fill('Cambio aprobado en revisión e2e')
  await page.getByRole('button', { name: /resolver garantía/i }).click()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('garantias')
        .select('estado, resolucion')
        .eq('id', garantiaId as string)
        .single()

      return `${data?.estado}:${data?.resolucion}`
    })
    .toBe('resuelta:cambio')

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('movimientos_inventario')
        .select('id')
        .eq('referencia_tipo', 'garantia')
        .eq('referencia_id', garantiaId as string)
        .eq('tipo', 'ajuste')
        .maybeSingle()

      return data?.id ?? null
    })
    .not.toBeNull()
})

test('admin crea, confirma y recibe una compra actualizando inventario central', async ({ page }) => {
  const providerName = `Proveedor Sprint7 ${Date.now()}`
  let proveedorId: string | null = null
  let compraId: string | null = null
  const { data: inventarioAntes } = await adminSupabase
    .from('inventario_central')
    .select('cantidad_actual')
    .eq('producto_id', producto1Id)
    .single()

  await loginAdmin(page)

  await page.goto('/admin/proveedores')
  await expect(page.getByRole('heading', { name: /proveedores/i })).toBeVisible()
  await page.getByRole('button', { name: /nuevo proveedor/i }).click()
  await page.locator('input[name="nombre"]').fill(providerName)
  await page.locator('input[name="contacto_email"]').fill('sprint7@proveedor.test')
  await page.getByRole('button', { name: /guardar proveedor/i }).click()
  await expect(page.getByText(providerName)).toBeVisible()

  await page.goto('/admin/compras')
  await expect(page.getByRole('heading', { name: /compras/i })).toBeVisible()
  await page.getByRole('button', { name: /nueva compra/i }).click()

  await page.locator('select[name="proveedor_id"]').selectOption({ label: providerName })
  await page.locator('select[name="lineas.0.producto_id"]').selectOption(producto1Id)
  await page.locator('input[name="lineas.0.cantidad_pedida"]').fill('3')
  await page.locator('input[name="lineas.0.costo_unitario"]').fill('12000')
  await page.getByRole('button', { name: /crear orden/i }).click()

  await page.getByLabel(/buscar por proveedor o producto/i).fill(providerName)
  await page.waitForTimeout(350)
  await expect(page.locator('tbody').getByText(providerName)).toBeVisible()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('proveedores')
        .select('id')
        .eq('nombre', providerName)
        .maybeSingle()

      proveedorId = data?.id ?? null
      return proveedorId
    })
    .not.toBeNull()

  await page.getByRole('button', { name: /confirmar/i }).click()
  await page.getByRole('button', { name: /recibir/i }).click()
  await expect(page.getByRole('heading', { name: /recibir compra/i })).toBeVisible()
  await page.getByRole('button', { name: /confirmar recepción/i }).click()

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('compras')
        .select('id, estado, total_real')
        .eq('proveedor_id', proveedorId as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      compraId = data?.id ?? null
      return data?.estado ?? null
    })
    .toBe('recibida')

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('inventario_central')
        .select('cantidad_actual')
        .eq('producto_id', producto1Id)
        .single()

      return data?.cantidad_actual ?? 0
    })
    .toBe((inventarioAntes?.cantidad_actual ?? 0) + 3)

  await expect
    .poll(async () => {
      const { data } = await adminSupabase
        .from('movimientos_inventario')
        .select('id')
        .eq('referencia_tipo', 'compra')
        .eq('referencia_id', compraId as string)
        .eq('tipo', 'compra')
        .maybeSingle()

      return data?.id ?? null
    })
    .not.toBeNull()
})
