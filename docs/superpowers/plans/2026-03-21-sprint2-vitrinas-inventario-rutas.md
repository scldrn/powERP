# Sprint 2 — Vitrinas + Inventario Central + Rutas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar los módulos de Vitrinas (con surtido estándar e inventario), Inventario Central, y Rutas (con ordenamiento drag & drop de PDVs) en el panel admin.

**Architecture:** Tres módulos admin que siguen el patrón de Sprint 1 (DataTable + Sheet + Hook + Zod), excepto Vitrinas que tiene una página de detalle con tabs en lugar de sheet único. Rutas usa `@dnd-kit` para ordenar PDVs. Todos los hooks son all-client con React Query v5.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgREST), React Query v5, React Hook Form, Zod, `@dnd-kit/core` + `@dnd-kit/sortable`, Playwright (e2e)

---

## Prerequisito: estado de ramas

Sprint 1 está en la rama `feature/sprint1-auth-productos-pdv` con PR #1 abierto a `main`. Sprint 2 **debe** construirse sobre ese código. Opciones:

- **Recomendado:** Hacer merge del PR #1 a `main` → crear `develop` → crear rama Sprint 2 desde `develop`.
- **Alternativa rápida:** Crear rama Sprint 2 directamente desde `feature/sprint1-auth-productos-pdv`.

El plan asume que **el código de Sprint 1 ya está disponible** en la rama de trabajo.

---

## File Map

### Archivos nuevos
| Archivo | Responsabilidad |
|---------|----------------|
| `lib/validations/vitrinas.ts` | Zod schemas para vitrina (reemplaza stub) |
| `lib/validations/rutas.ts` | Zod schemas para ruta (reemplaza stub) |
| `lib/validations/inventario.ts` | Zod schema para entrada de inventario |
| `lib/hooks/useVitrinas.ts` | CRUD vitrinas + retiro |
| `lib/hooks/useSurtidoEstandar.ts` | CRUD surtido por vitrina |
| `lib/hooks/useInventarioVitrina.ts` | Read inventario_vitrina join surtido |
| `lib/hooks/useInventarioCentral.ts` | Read + mutación entrada central |
| `lib/hooks/useRutas.ts` | CRUD rutas + PDVs asociados |
| `lib/hooks/useColaboradoras.ts` | Lista usuarios rol=colaboradora (para selects) |
| `components/admin/VitrinaSheet.tsx` | Sheet crear/editar vitrina |
| `components/admin/SurtidoEstandarTab.tsx` | Tab gestión surtido en detalle vitrina |
| `components/admin/InventarioVitrinaTab.tsx` | Tab inventario actual en detalle vitrina |
| `components/admin/InventarioCentralSheet.tsx` | Sheet registrar entrada al central |
| `components/admin/PDVSortableList.tsx` | Lista DnD de PDVs en ruta |
| `components/admin/RutaSheet.tsx` | Sheet crear/editar ruta (con DnD) |
| `app/(admin)/admin/vitrinas/page.tsx` | Listado de vitrinas |
| `app/(admin)/admin/vitrinas/[id]/page.tsx` | Detalle vitrina con tabs |
| `app/(admin)/admin/inventario/page.tsx` | Inventario central |
| `app/(admin)/admin/rutas/page.tsx` | Listado de rutas |
| `tests/sprint2.spec.ts` | Tests e2e Playwright Sprint 2 |

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `components/admin/AppSidebar.tsx` | Agregar 3 nav items: Vitrinas, Inventario, Rutas |

---

## Task 1: Setup — rama y dependencia dnd-kit

**Files:**
- Modify: `erp-vitrinas/package.json`

- [ ] **Step 1: Crear rama de trabajo**

```bash
# Opción A (recomendada): PR #1 ya mergeado a main, develop creado
git checkout main && git pull
git checkout -b develop
git checkout -b feature/sprint2-vitrinas-inventario-rutas

# Opción B: construir sobre sprint1 directamente
git checkout feature/sprint1-auth-productos-pdv
git checkout -b feature/sprint2-vitrinas-inventario-rutas
```

- [ ] **Step 2: Instalar dnd-kit (desde erp-vitrinas/)**

```bash
cd erp-vitrinas
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 3: Verificar que el servidor levanta sin errores**

```bash
npm run dev
```
Esperado: compilación exitosa, sin errores de tipos.

- [ ] **Step 4: Commit setup**

```bash
git add erp-vitrinas/package.json erp-vitrinas/package-lock.json
git commit -m "chore: instalar @dnd-kit para ordenamiento de PDVs en rutas"
```

---

## Task 2: Validaciones y hooks — módulo Vitrinas

**Files:**
- Create: `erp-vitrinas/lib/validations/vitrinas.ts`
- Create: `erp-vitrinas/lib/hooks/useVitrinas.ts`
- Create: `erp-vitrinas/lib/hooks/useSurtidoEstandar.ts`
- Create: `erp-vitrinas/lib/hooks/useInventarioVitrina.ts`

- [ ] **Step 1: Escribir test e2e inicial que falla (página no existe aún)**

En `erp-vitrinas/tests/sprint2.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Sprint 2 — Vitrinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@erp.local')
    await page.fill('input[name="password"]', 'Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('navega a listado de vitrinas', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await expect(page.getByRole('heading', { name: 'Vitrinas' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Verificar que el test falla**

```bash
npx playwright test tests/sprint2.spec.ts --reporter=line
```
Esperado: FAIL — página `/admin/vitrinas` no existe (404 o redirect).

- [ ] **Step 3: Escribir schema Zod — `lib/validations/vitrinas.ts`**

```typescript
import { z } from 'zod'

export const vitrinaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  pdv_id: z.string().uuid('Selecciona un Punto de Venta'),
  tipo: z.string().optional(),
  estado: z.enum(['activa', 'inactiva']).default('activa'),
  notas: z.string().optional(),
})

export type VitrinaFormValues = z.infer<typeof vitrinaSchema>
```

- [ ] **Step 4: Escribir hook `lib/hooks/useVitrinas.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { VitrinaFormValues } from '@/lib/validations/vitrinas'

type Vitrina = Database['public']['Tables']['vitrinas']['Row'] & {
  puntos_de_venta: { nombre_comercial: string; zona_id: string | null } | null
}

const QUERY_KEY = ['vitrinas'] as const

export function useVitrinas() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vitrinas')
        .select('*, puntos_de_venta(nombre_comercial, zona_id)')
        .order('codigo')
      if (error) throw new Error(error.message)
      return data as Vitrina[]
    },
  })
}

export function useCreateVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: VitrinaFormValues) => {
      const { error } = await supabase.from('vitrinas').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<VitrinaFormValues> }) => {
      const { error } = await supabase.from('vitrinas').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRetirarVitrina() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vitrinas')
        .update({ estado: 'retirada', fecha_retiro: new Date().toISOString().split('T')[0] })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

- [ ] **Step 5: Escribir hook `lib/hooks/useSurtidoEstandar.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type SurtidoItem = Database['public']['Tables']['surtido_estandar']['Row'] & {
  productos: { nombre: string; codigo: string } | null
}

export function useSurtidoEstandar(vitrinaId: string) {
  const supabase = createClient()
  const queryKey = ['surtido_estandar', vitrinaId] as const

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surtido_estandar')
        .select('*, productos(nombre, codigo)')
        .eq('vitrina_id', vitrinaId)
        .order('created_at')
      if (error) throw new Error(error.message)
      return data as SurtidoItem[]
    },
    enabled: !!vitrinaId,
  })

  const queryClient = useQueryClient()

  const addItem = useMutation({
    mutationFn: async ({ producto_id, cantidad_objetivo }: { producto_id: string; cantidad_objetivo: number }) => {
      const { error } = await supabase
        .from('surtido_estandar')
        .insert({ vitrina_id: vitrinaId, producto_id, cantidad_objetivo })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const updateCantidad = useMutation({
    mutationFn: async ({ id, cantidad_objetivo }: { id: string; cantidad_objetivo: number }) => {
      const { error } = await supabase
        .from('surtido_estandar')
        .update({ cantidad_objetivo })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('surtido_estandar').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { ...query, addItem, updateCantidad, removeItem }
}
```

- [ ] **Step 6: Escribir hook `lib/hooks/useInventarioVitrina.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export type InventarioVitrinaRow = {
  producto_id: string
  nombre: string
  codigo: string
  cantidad_objetivo: number | null
  cantidad_actual: number
  diferencia: number
  estado: 'ok' | 'bajo' | 'vacio'
}

export function useInventarioVitrina(vitrinaId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['inventario_vitrina', vitrinaId] as const,
    queryFn: async () => {
      // Join surtido_estandar (fuente de cantidad_objetivo) con inventario_vitrina (stock actual)
      const { data: surtido, error: eSurtido } = await supabase
        .from('surtido_estandar')
        .select('producto_id, cantidad_objetivo, productos(nombre, codigo)')
        .eq('vitrina_id', vitrinaId)
      if (eSurtido) throw new Error(eSurtido.message)

      const { data: stock, error: eStock } = await supabase
        .from('inventario_vitrina')
        .select('producto_id, cantidad_actual')
        .eq('vitrina_id', vitrinaId)
      if (eStock) throw new Error(eStock.message)

      const stockMap = new Map(stock?.map((s) => [s.producto_id, s.cantidad_actual]) ?? [])

      return (surtido ?? []).map((s): InventarioVitrinaRow => {
        const actual = stockMap.get(s.producto_id) ?? 0
        const objetivo = s.cantidad_objetivo
        const diferencia = (objetivo ?? 0) - actual
        const estado: InventarioVitrinaRow['estado'] =
          actual === 0 ? 'vacio' : actual < (objetivo ?? 0) ? 'bajo' : 'ok'
        return {
          producto_id: s.producto_id,
          nombre: (s.productos as { nombre: string; codigo: string } | null)?.nombre ?? '—',
          codigo: (s.productos as { nombre: string; codigo: string } | null)?.codigo ?? '—',
          cantidad_objetivo: objetivo,
          cantidad_actual: actual,
          diferencia,
          estado,
        }
      })
    },
    enabled: !!vitrinaId,
  })
}
```

- [ ] **Step 7: Commit**

```bash
git add erp-vitrinas/lib/validations/vitrinas.ts \
        erp-vitrinas/lib/hooks/useVitrinas.ts \
        erp-vitrinas/lib/hooks/useSurtidoEstandar.ts \
        erp-vitrinas/lib/hooks/useInventarioVitrina.ts \
        erp-vitrinas/tests/sprint2.spec.ts
git commit -m "feat: validaciones y hooks para módulo Vitrinas"
```

---

## Task 3: Componentes y página — Listado de Vitrinas

**Files:**
- Create: `erp-vitrinas/components/admin/VitrinaSheet.tsx`
- Create: `erp-vitrinas/app/(admin)/admin/vitrinas/page.tsx`

- [ ] **Step 1: Crear `components/admin/VitrinaSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { vitrinaSchema } from '@/lib/validations/vitrinas'
import { useCreateVitrina, useUpdateVitrina } from '@/lib/hooks/useVitrinas'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import type { Database } from '@/lib/supabase/database.types'

type Vitrina = Database['public']['Tables']['vitrinas']['Row']
type FormInput = z.input<typeof vitrinaSchema>
type FormOutput = z.output<typeof vitrinaSchema>

interface VitrinaSheetProps {
  open: boolean
  onClose: () => void
  vitrina?: Vitrina | null
}

export function VitrinaSheet({ open, onClose, vitrina }: VitrinaSheetProps) {
  const { data: pdvs = [] } = usePuntosDeVenta()
  const createVitrina = useCreateVitrina()
  const updateVitrina = useUpdateVitrina()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(vitrinaSchema),
    defaultValues: { estado: 'activa' },
  })

  useEffect(() => {
    if (!open) return
    if (vitrina) {
      reset({
        codigo: vitrina.codigo,
        pdv_id: vitrina.pdv_id,
        tipo: vitrina.tipo ?? '',
        estado: vitrina.estado as 'activa' | 'inactiva',
        notas: vitrina.notas ?? '',
      })
    } else {
      reset({ estado: 'activa', codigo: '', tipo: '', notas: '' })
    }
  }, [open, vitrina, reset])

  async function onSubmit(values: FormOutput) {
    try {
      if (vitrina) {
        await updateVitrina.mutateAsync({ id: vitrina.id, values })
      } else {
        await createVitrina.mutateAsync(values)
      }
      toast.success('Vitrina guardada')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate = msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  const pdvsActivos = pdvs.filter((p) => p.activo)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{vitrina ? 'Editar vitrina' : 'Nueva vitrina'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium">Código *</label>
            <input
              {...register('codigo')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="VIT-001"
            />
            {errors.codigo && <p className="mt-1 text-xs text-red-500">{errors.codigo.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Punto de Venta *</label>
            <select
              {...register('pdv_id')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un PDV</option>
              {pdvsActivos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre_comercial}</option>
              ))}
            </select>
            {errors.pdv_id && <p className="mt-1 text-xs text-red-500">{errors.pdv_id.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <input
              {...register('tipo')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Ej: exhibidor, caja, vitrina..."
            />
          </div>

          {vitrina && (
            <div>
              <label className="text-sm font-medium">Estado</label>
              <select
                {...register('estado')}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea
              {...register('notas')}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/admin/vitrinas/page.tsx`**

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Eye, ArchiveX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { VitrinaSheet } from '@/components/admin/VitrinaSheet'
import { useVitrinas, useRetirarVitrina } from '@/lib/hooks/useVitrinas'
import type { Database } from '@/lib/supabase/database.types'

type Vitrina = Database['public']['Tables']['vitrinas']['Row'] & {
  puntos_de_venta: { nombre_comercial: string } | null
}

const ESTADO_BADGE: Record<string, string> = {
  activa: 'bg-green-100 text-green-700',
  inactiva: 'bg-yellow-100 text-yellow-700',
  retirada: 'bg-slate-100 text-slate-500',
}

export default function VitrinasPage() {
  const { data: vitrinas = [], isLoading } = useVitrinas()
  const retirar = useRetirarVitrina()

  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Vitrina | null>(null)
  const [confirmRetiro, setConfirmRetiro] = useState<Vitrina | null>(null)

  const filtered = useMemo(() => {
    return vitrinas.filter((v) => {
      const matchSearch =
        !search ||
        v.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (v.puntos_de_venta?.nombre_comercial ?? '').toLowerCase().includes(search.toLowerCase())
      const matchEstado = filterEstado === 'todos' || v.estado === filterEstado
      return matchSearch && matchEstado
    })
  }, [vitrinas, search, filterEstado])

  const handleRetirar = useCallback(async (vitrina: Vitrina) => {
    try {
      await retirar.mutateAsync(vitrina.id)
      toast.success('Vitrina marcada como retirada')
      setConfirmRetiro(null)
    } catch {
      toast.error('Error al retirar la vitrina')
    }
  }, [retirar])

  const columns = useMemo<Column<Vitrina>[]>(() => [
    { key: 'codigo', header: 'Código', render: (v) => <span className="font-mono text-xs">{v.codigo}</span> },
    { key: 'pdv', header: 'Punto de Venta', render: (v) => v.puntos_de_venta?.nombre_comercial ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (v) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[v.estado] ?? ''}`}>
          {v.estado}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (v) => (
        <div className="flex items-center gap-1 justify-end">
          <Link href={`/admin/vitrinas/${v.id}`}>
            <Button variant="ghost" size="sm" title="Ver detalle"><Eye size={14} /></Button>
          </Link>
          <Button variant="ghost" size="sm" title="Editar" onClick={() => { setEditing(v); setSheetOpen(true) }}>
            <Pencil size={14} />
          </Button>
          {v.estado !== 'retirada' && (
            <Button variant="ghost" size="sm" title="Retirar" onClick={() => setConfirmRetiro(v)}>
              <ArchiveX size={14} className="text-red-400" />
            </Button>
          )}
        </div>
      ),
    },
  ], [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Vitrinas</h1>
        <Button onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1" /> Nueva vitrina
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código o PDV..." />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="todos">Todos los estados</option>
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
          <option value="retirada">Retirada</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(v) => v.id}
        emptyMessage="No hay vitrinas registradas"
      />

      <VitrinaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        vitrina={editing}
      />

      {/* Dialog de confirmación de retiro */}
      {confirmRetiro && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="font-semibold text-slate-800 mb-2">¿Retirar vitrina {confirmRetiro.codigo}?</h2>
            <p className="text-sm text-slate-500 mb-4">Esta acción no se puede deshacer. La vitrina quedará marcada como retirada y no aparecerá en nuevas visitas.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmRetiro(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => handleRetirar(confirmRetiro)}
                disabled={retirar.isPending}
              >
                {retirar.isPending ? 'Retirando...' : 'Confirmar retiro'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verificar que el test ahora pasa**

```bash
npx playwright test tests/sprint2.spec.ts --reporter=line
```
Esperado: PASS para "navega a listado de vitrinas".

- [ ] **Step 4: Commit**

```bash
git add erp-vitrinas/components/admin/VitrinaSheet.tsx \
        erp-vitrinas/app/\(admin\)/admin/vitrinas/page.tsx
git commit -m "feat: listado y sheet de vitrinas"
```

---

## Task 4: Página de detalle Vitrina — Tab Info + retiro

**Files:**
- Create: `erp-vitrinas/app/(admin)/admin/vitrinas/[id]/page.tsx`

- [ ] **Step 1: Agregar test e2e para detalle de vitrina**

En `tests/sprint2.spec.ts`, dentro del describe "Vitrinas":

```typescript
test('crea una vitrina y navega a su detalle', async ({ page }) => {
  await page.goto('/admin/vitrinas')
  await page.click('button:has-text("Nueva vitrina")')
  await page.fill('input[name="codigo"]', 'VIT-TEST-01')
  // Selecciona el primer PDV disponible
  await page.locator('select[name="pdv_id"]').selectOption({ index: 1 })
  await page.click('button[type="submit"]')
  await expect(page.getByText('Vitrina guardada')).toBeVisible()

  // Navegar al detalle
  await page.click('button[title="Ver detalle"]')
  await expect(page.getByRole('heading', { name: /VIT-TEST-01/ })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Info' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Surtido estándar' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Inventario actual' })).toBeVisible()
})
```

- [ ] **Step 2: Crear `app/(admin)/admin/vitrinas/[id]/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useVitrinas, useRetirarVitrina } from '@/lib/hooks/useVitrinas'
import { VitrinaSheet } from '@/components/admin/VitrinaSheet'
import { SurtidoEstandarTab } from '@/components/admin/SurtidoEstandarTab'
import { InventarioVitrinaTab } from '@/components/admin/InventarioVitrinaTab'

type Tab = 'info' | 'surtido' | 'inventario'

export default function VitrinaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: vitrinas = [] } = useVitrinas()
  const retirar = useRetirarVitrina()

  const { isLoading } = useVitrinas()
  const vitrina = vitrinas.find((v) => v.id === id)
  const [tab, setTab] = useState<Tab>('info')
  const [editOpen, setEditOpen] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-400">Cargando...</div>
  }

  if (!vitrina) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Vitrina no encontrada.</p>
        <Link href="/admin/vitrinas" className="text-indigo-600 text-sm mt-2 inline-block">← Volver</Link>
      </div>
    )
  }

  async function handleRetirar() {
    try {
      await retirar.mutateAsync(vitrina!.id)
      toast.success('Vitrina retirada')
      router.push('/admin/vitrinas')
    } catch {
      toast.error('Error al retirar la vitrina')
    }
  }

  const ESTADO_COLOR: Record<string, string> = {
    activa: 'text-green-600', inactiva: 'text-yellow-600', retirada: 'text-slate-400',
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/vitrinas">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 className="text-xl font-semibold text-slate-800">{vitrina.codigo}</h1>
        <span className={`text-sm font-medium ${ESTADO_COLOR[vitrina.estado]}`}>{vitrina.estado}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil size={14} className="mr-1" /> Editar
          </Button>
          {vitrina.estado !== 'retirada' && (
            <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
              Marcar como retirada
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {(['info', 'surtido', 'inventario'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'info' ? 'Info' : t === 'surtido' ? 'Surtido estándar' : 'Inventario actual'}
          </button>
        ))}
      </div>

      {/* Tab Info */}
      {tab === 'info' && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div><dt className="text-slate-400">Código</dt><dd className="font-mono">{vitrina.codigo}</dd></div>
          <div><dt className="text-slate-400">Punto de Venta</dt><dd>{(vitrina as any).puntos_de_venta?.nombre_comercial ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Tipo</dt><dd>{vitrina.tipo ?? '—'}</dd></div>
          <div><dt className="text-slate-400">Estado</dt><dd className={ESTADO_COLOR[vitrina.estado]}>{vitrina.estado}</dd></div>
          <div><dt className="text-slate-400">Fecha instalación</dt><dd>{vitrina.fecha_instalacion ?? '—'}</dd></div>
          {vitrina.fecha_retiro && <div><dt className="text-slate-400">Fecha retiro</dt><dd>{vitrina.fecha_retiro}</dd></div>}
          {vitrina.notas && <div className="col-span-2"><dt className="text-slate-400">Notas</dt><dd>{vitrina.notas}</dd></div>}
        </dl>
      )}

      {tab === 'surtido' && <SurtidoEstandarTab vitrinaId={id} />}
      {tab === 'inventario' && <InventarioVitrinaTab vitrinaId={id} />}

      {/* Sheet edición */}
      <VitrinaSheet open={editOpen} onClose={() => setEditOpen(false)} vitrina={vitrina as any} />

      {/* Dialog confirmación retiro */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
            <h2 className="font-semibold text-slate-800 mb-2">¿Retirar vitrina {vitrina.codigo}?</h2>
            <p className="text-sm text-slate-500 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleRetirar} disabled={retirar.isPending}>
                {retirar.isPending ? 'Retirando...' : 'Confirmar retiro'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add erp-vitrinas/app/\(admin\)/admin/vitrinas/
git commit -m "feat: página de detalle de vitrina con tabs"
```

---

## Task 5: Tab Surtido estándar + Tab Inventario actual

**Files:**
- Create: `erp-vitrinas/components/admin/SurtidoEstandarTab.tsx`
- Create: `erp-vitrinas/components/admin/InventarioVitrinaTab.tsx`

- [ ] **Step 1: Crear `components/admin/SurtidoEstandarTab.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useSurtidoEstandar } from '@/lib/hooks/useSurtidoEstandar'
import { useProductosActivos } from '@/lib/hooks/useProductos'

interface Props { vitrinaId: string }

export function SurtidoEstandarTab({ vitrinaId }: Props) {
  const { data: items = [], isLoading, addItem, updateCantidad, removeItem } = useSurtidoEstandar(vitrinaId)
  const { data: productos = [] } = useProductosActivos()

  const [addMode, setAddMode] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCantidad, setEditCantidad] = useState(1)

  const productosEnSurtido = new Set(items.map((i) => i.producto_id))
  const productosDisponibles = productos.filter((p) => !productosEnSurtido.has(p.id))

  async function handleAdd() {
    if (!selectedProducto || cantidad < 1) return
    try {
      await addItem.mutateAsync({ producto_id: selectedProducto, cantidad_objetivo: cantidad })
      toast.success('Producto agregado al surtido')
      setAddMode(false)
      setSelectedProducto('')
      setCantidad(1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al agregar')
    }
  }

  async function handleUpdateCantidad(id: string) {
    try {
      await updateCantidad.mutateAsync({ id, cantidad_objetivo: editCantidad })
      setEditingId(null)
    } catch {
      toast.error('Error al actualizar cantidad')
    }
  }

  async function handleRemove(id: string) {
    try {
      await removeItem.mutateAsync(id)
      toast.success('Producto quitado del surtido')
    } catch {
      toast.error('Error al quitar producto')
    }
  }

  if (isLoading) return <p className="text-sm text-slate-400">Cargando surtido...</p>

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setAddMode(true)} disabled={addMode || productosDisponibles.length === 0}>
          <Plus size={14} className="mr-1" /> Agregar producto
        </Button>
      </div>

      {addMode && (
        <div className="flex gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
          <select
            value={selectedProducto}
            onChange={(e) => setSelectedProducto(e.target.value)}
            className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Selecciona un producto</option>
            {productosDisponibles.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
            className="w-20 rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
          <Button size="sm" onClick={handleAdd} disabled={!selectedProducto}>Agregar</Button>
          <Button size="sm" variant="outline" onClick={() => setAddMode(false)}>Cancelar</Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No hay productos en el surtido estándar</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase">Producto</th>
              <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase">Cantidad objetivo</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-2">
                  {(item.productos as any)?.nombre ?? '—'}
                  <span className="ml-2 text-xs text-slate-400 font-mono">{(item.productos as any)?.codigo}</span>
                </td>
                <td className="py-2">
                  {editingId === item.id ? (
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min={1}
                        value={editCantidad}
                        onChange={(e) => setEditCantidad(Number(e.target.value))}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleUpdateCantidad(item.id)}>OK</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>×</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(item.id); setEditCantidad(item.cantidad_objetivo) }}
                      className="text-slate-700 hover:text-indigo-600 underline decoration-dashed"
                    >
                      {item.cantidad_objetivo}
                    </button>
                  )}
                </td>
                <td className="py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)}>
                    <Trash2 size={14} className="text-red-400" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Crear `components/admin/InventarioVitrinaTab.tsx`**

```typescript
'use client'

import { useInventarioVitrina } from '@/lib/hooks/useInventarioVitrina'

const ESTADO_STYLES = {
  ok: { badge: 'bg-green-100 text-green-700', label: 'OK' },
  bajo: { badge: 'bg-orange-100 text-orange-700', label: 'Bajo' },
  vacio: { badge: 'bg-red-100 text-red-700', label: 'Vacío' },
}

interface Props { vitrinaId: string }

export function InventarioVitrinaTab({ vitrinaId }: Props) {
  const { data: rows = [], isLoading } = useInventarioVitrina(vitrinaId)

  if (isLoading) return <p className="text-sm text-slate-400">Cargando inventario...</p>

  if (rows.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">Sin surtido estándar definido. Configura el surtido primero.</p>
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-100">
          <th className="text-left py-2 text-xs font-medium text-slate-500 uppercase">Producto</th>
          <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Objetivo</th>
          <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Stock actual</th>
          <th className="text-right py-2 text-xs font-medium text-slate-500 uppercase">Diferencia</th>
          <th className="text-center py-2 text-xs font-medium text-slate-500 uppercase">Estado</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const styles = ESTADO_STYLES[row.estado]
          return (
            <tr key={row.producto_id} className="border-b border-slate-50">
              <td className="py-2">
                {row.nombre}
                <span className="ml-2 text-xs text-slate-400 font-mono">{row.codigo}</span>
              </td>
              <td className="py-2 text-right text-slate-600">{row.cantidad_objetivo ?? '—'}</td>
              <td className="py-2 text-right font-medium">{row.cantidad_actual}</td>
              <td className={`py-2 text-right font-medium ${row.diferencia > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {row.diferencia > 0 ? `-${row.diferencia}` : '0'}
              </td>
              <td className="py-2 text-center">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles.badge}`}>
                  {styles.label}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 3: Asegurarse de que `useProductosActivos` está exportado en `lib/hooks/useProductos.ts`**

Si no existe, agregar al archivo:

```typescript
export function useProductosActivos() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['productos', 'activos'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo, nombre, categoria_id')
        .eq('estado', 'activo')
        .order('nombre')
      if (error) throw new Error(error.message)
      return data
    },
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add erp-vitrinas/components/admin/SurtidoEstandarTab.tsx \
        erp-vitrinas/components/admin/InventarioVitrinaTab.tsx \
        erp-vitrinas/lib/hooks/useProductos.ts
git commit -m "feat: tabs surtido estándar e inventario actual en detalle vitrina"
```

---

## Task 6: Módulo Inventario Central

**Files:**
- Create: `erp-vitrinas/lib/validations/inventario.ts`
- Create: `erp-vitrinas/lib/hooks/useInventarioCentral.ts`
- Create: `erp-vitrinas/components/admin/InventarioCentralSheet.tsx`
- Create: `erp-vitrinas/app/(admin)/admin/inventario/page.tsx`

- [ ] **Step 1: Agregar test e2e para inventario central**

En `tests/sprint2.spec.ts`:

```typescript
test.describe('Sprint 2 — Inventario Central', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@erp.local')
    await page.fill('input[name="password"]', 'Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('navega a inventario central', async ({ page }) => {
    await page.goto('/admin/inventario')
    await expect(page.getByRole('heading', { name: 'Inventario Central' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Verificar que el test falla**

```bash
npx playwright test tests/sprint2.spec.ts -g "navega a inventario central" --reporter=line
```

- [ ] **Step 3: Crear `lib/validations/inventario.ts`**

```typescript
import { z } from 'zod'

export const entradaInventarioCentralSchema = z.object({
  producto_id: z.string().uuid('Selecciona un producto'),
  cantidad: z.number({ invalid_type_error: 'Ingresa una cantidad' }).int().min(1, 'La cantidad debe ser mayor a 0'),
  costo_unitario: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).optional()
  ),
  notas: z.string().optional(),
})

export type EntradaInventarioCentralValues = z.infer<typeof entradaInventarioCentralSchema>
```

- [ ] **Step 4: Crear `lib/hooks/useInventarioCentral.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { EntradaInventarioCentralValues } from '@/lib/validations/inventario'

const QUERY_KEY = ['inventario_central'] as const

export type InventarioCentralRow = {
  producto_id: string
  nombre: string
  codigo: string
  categoria: string | null
  cantidad_actual: number
  costo_promedio: number | null
  valor_total: number | null
}

export function useInventarioCentral() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventario_central')
        .select('producto_id, cantidad_actual, costo_promedio, productos(nombre, codigo, categorias(nombre))')
        .order('productos(nombre)')
      if (error) throw new Error(error.message)
      return (data ?? []).map((row): InventarioCentralRow => {
        const p = row.productos as { nombre: string; codigo: string; categorias: { nombre: string } | null } | null
        return {
          producto_id: row.producto_id,
          nombre: p?.nombre ?? '—',
          codigo: p?.codigo ?? '—',
          categoria: p?.categorias?.nombre ?? null,
          cantidad_actual: row.cantidad_actual,
          costo_promedio: row.costo_promedio ? Number(row.costo_promedio) : null,
          valor_total: row.costo_promedio ? Number(row.costo_promedio) * row.cantidad_actual : null,
        }
      })
    },
  })
}

export function useRegistrarEntrada() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: EntradaInventarioCentralValues) => {
      const { error } = await supabase.from('movimientos_inventario').insert({
        tipo: 'compra',
        direccion: 'entrada',
        destino_tipo: 'central',
        producto_id: values.producto_id,
        cantidad: values.cantidad,
        costo_unitario: values.costo_unitario ?? null,
        notas: values.notas ?? null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

- [ ] **Step 5: Crear `components/admin/InventarioCentralSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { entradaInventarioCentralSchema } from '@/lib/validations/inventario'
import { useRegistrarEntrada } from '@/lib/hooks/useInventarioCentral'
import { useProductosActivos } from '@/lib/hooks/useProductos'
import type { EntradaInventarioCentralValues } from '@/lib/validations/inventario'

interface Props { open: boolean; onClose: () => void }

export function InventarioCentralSheet({ open, onClose }: Props) {
  const { data: productos = [] } = useProductosActivos()
  const registrar = useRegistrarEntrada()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EntradaInventarioCentralValues>({
    resolver: zodResolver(entradaInventarioCentralSchema),
  })

  useEffect(() => {
    if (!open) return
    reset({ cantidad: 1, notas: '', costo_unitario: undefined })
  }, [open, reset])

  async function onSubmit(values: EntradaInventarioCentralValues) {
    try {
      await registrar.mutateAsync(values)
      toast.success('Entrada registrada')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar entrada al inventario central</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div>
            <label className="text-sm font-medium">Producto *</label>
            <select
              {...register('producto_id')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
              ))}
            </select>
            {errors.producto_id && <p className="mt-1 text-xs text-red-500">{errors.producto_id.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Cantidad *</label>
            <input
              type="number"
              min={1}
              {...register('cantidad', { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            {errors.cantidad && <p className="mt-1 text-xs text-red-500">{errors.cantidad.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium">Costo unitario (opcional)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              {...register('costo_unitario')}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notas</label>
            <textarea
              {...register('notas')}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              placeholder="Nº de factura, referencia, etc."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Registrando...' : 'Registrar entrada'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 6: Crear `app/(admin)/admin/inventario/page.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { InventarioCentralSheet } from '@/components/admin/InventarioCentralSheet'
import { useInventarioCentral, type InventarioCentralRow } from '@/lib/hooks/useInventarioCentral'

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function InventarioCentralPage() {
  const { data: rows = [], isLoading } = useInventarioCentral()
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)

  const filtered = useMemo(() =>
    rows.filter((r) =>
      !search ||
      r.nombre.toLowerCase().includes(search.toLowerCase()) ||
      r.codigo.toLowerCase().includes(search.toLowerCase())
    ), [rows, search])

  const columns = useMemo<Column<InventarioCentralRow>[]>(() => [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: 'nombre', header: 'Producto', render: (r) => r.nombre },
    { key: 'categoria', header: 'Categoría', render: (r) => r.categoria ?? '—' },
    { key: 'stock', header: 'Stock actual', render: (r) => <span className="font-medium">{r.cantidad_actual}</span> },
    { key: 'costo', header: 'Costo promedio', render: (r) => r.costo_promedio ? fmt.format(r.costo_promedio) : '—' },
    { key: 'valor', header: 'Valor total', render: (r) => r.valor_total ? fmt.format(r.valor_total) : '—' },
  ], [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Inventario Central</h1>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus size={16} className="mr-1" /> Registrar entrada
        </Button>
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar producto..." />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(r) => r.producto_id}
        emptyMessage="No hay stock registrado en el inventario central"
      />

      <InventarioCentralSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </div>
  )
}
```

- [ ] **Step 7: Verificar que el test pasa**

```bash
npx playwright test tests/sprint2.spec.ts -g "navega a inventario central" --reporter=line
```

- [ ] **Step 8: Commit**

```bash
git add erp-vitrinas/lib/validations/inventario.ts \
        erp-vitrinas/lib/hooks/useInventarioCentral.ts \
        erp-vitrinas/components/admin/InventarioCentralSheet.tsx \
        erp-vitrinas/app/\(admin\)/admin/inventario/
git commit -m "feat: módulo de inventario central con registro de entradas por compra"
```

---

## Task 7: Validaciones y hooks — módulo Rutas

**Files:**
- Create: `erp-vitrinas/lib/validations/rutas.ts`
- Create: `erp-vitrinas/lib/hooks/useRutas.ts`
- Create: `erp-vitrinas/lib/hooks/useColaboradoras.ts`

- [ ] **Step 1: Crear `lib/validations/rutas.ts`**

```typescript
import { z } from 'zod'

const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const

export const rutaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  colaboradora_id: z.string().uuid('Selecciona una colaboradora'),
  zona_id: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().uuid().optional()
  ),
  frecuencia: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.enum(['diaria', 'semanal', 'quincenal']).optional()
  ),
  dias_visita: z.array(z.enum(DIAS)).optional().default([]),
  estado: z.enum(['activa', 'inactiva']).default('activa'),
})

export type RutaFormValues = z.infer<typeof rutaSchema>
```

- [ ] **Step 2: Crear `lib/hooks/useColaboradoras.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

export function useColaboradoras() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['colaboradoras'] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, email')
        .eq('rol', 'colaboradora')
        .eq('activo', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return data as Pick<Usuario, 'id' | 'nombre' | 'email'>[]
    },
  })
}
```

- [ ] **Step 3: Crear `lib/hooks/useRutas.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { RutaFormValues } from '@/lib/validations/rutas'

type Ruta = Database['public']['Tables']['rutas']['Row'] & {
  usuarios: { nombre: string } | null
  zonas: { nombre: string } | null
  _pdv_count?: number
}

const QUERY_KEY = ['rutas'] as const

export function useRutas() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutas')
        .select('*, usuarios(nombre), zonas(nombre), rutas_pdv(pdv_id)')
        .order('codigo')
      if (error) throw new Error(error.message)
      // Calcular count client-side para evitar variaciones en el shape de PostgREST aggregates
      return (data ?? []).map((r) => ({
        ...r,
        _pdv_count: Array.isArray(r.rutas_pdv) ? r.rutas_pdv.length : 0,
      })) as Ruta[]
    },
  })
}

export type RutaPDV = { pdv_id: string; orden_visita: number }

export function useCreateRuta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, pdvs }: { values: RutaFormValues; pdvs: RutaPDV[] }) => {
      const { data: ruta, error } = await supabase
        .from('rutas')
        .insert(values)
        .select('id')
        .single()
      if (error) throw new Error(error.message)

      if (pdvs.length > 0) {
        const { error: ePdv } = await supabase
          .from('rutas_pdv')
          .insert(pdvs.map((p) => ({ ruta_id: ruta.id, ...p })))
        if (ePdv) throw new Error(ePdv.message)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateRuta() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values, pdvs }: { id: string; values: Partial<RutaFormValues>; pdvs: RutaPDV[] }) => {
      const { error } = await supabase.from('rutas').update(values).eq('id', id)
      if (error) throw new Error(error.message)

      // Delete + re-insert PDVs
      const { error: eDel } = await supabase.from('rutas_pdv').delete().eq('ruta_id', id)
      if (eDel) throw new Error(eDel.message)

      if (pdvs.length > 0) {
        const { error: eIns } = await supabase
          .from('rutas_pdv')
          .insert(pdvs.map((p) => ({ ruta_id: id, ...p })))
        if (eIns) throw new Error(eIns.message)
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useRutaPDVs(rutaId: string | undefined) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['rutas_pdv', rutaId] as const,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rutas_pdv')
        .select('pdv_id, orden_visita, puntos_de_venta(nombre_comercial, zona_id, zonas(nombre))')
        .eq('ruta_id', rutaId!)
        .order('orden_visita')
      if (error) throw new Error(error.message)
      return data ?? []
    },
    enabled: !!rutaId,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add erp-vitrinas/lib/validations/rutas.ts \
        erp-vitrinas/lib/hooks/useRutas.ts \
        erp-vitrinas/lib/hooks/useColaboradoras.ts
git commit -m "feat: validaciones y hooks para módulo Rutas"
```

---

## Task 8: Componentes Rutas — PDVSortableList + RutaSheet

**Files:**
- Create: `erp-vitrinas/components/admin/PDVSortableList.tsx`
- Create: `erp-vitrinas/components/admin/RutaSheet.tsx`

- [ ] **Step 1: Agregar test e2e para rutas**

En `tests/sprint2.spec.ts`:

```typescript
test.describe('Sprint 2 — Rutas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'admin@erp.local')
    await page.fill('input[name="password"]', 'Admin1234!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/admin/dashboard')
  })

  test('navega a listado de rutas', async ({ page }) => {
    await page.goto('/admin/rutas')
    await expect(page.getByRole('heading', { name: 'Rutas' })).toBeVisible()
  })
})
```

- [ ] **Step 2: Crear `components/admin/PDVSortableList.tsx`**

```typescript
'use client'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

export type PDVItem = {
  pdv_id: string
  nombre_comercial: string
}

interface SortableItemProps {
  item: PDVItem
  onRemove: (id: string) => void
}

function SortableItem({ item, onRemove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.pdv_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-md mb-1"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
        aria-label="Arrastrar"
      >
        <GripVertical size={16} />
      </button>
      <span className="flex-1 text-sm">{item.nombre_comercial}</span>
      <button
        type="button"
        onClick={() => onRemove(item.pdv_id)}
        className="text-slate-300 hover:text-red-400"
        aria-label="Quitar"
      >
        <X size={14} />
      </button>
    </div>
  )
}

interface PDVSortableListProps {
  items: PDVItem[]
  onChange: (items: PDVItem[]) => void
}

export function PDVSortableList({ items, onChange }: PDVSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.pdv_id === active.id)
    const newIndex = items.findIndex((i) => i.pdv_id === over.id)
    onChange(arrayMove(items, oldIndex, newIndex))
  }

  function handleRemove(pdvId: string) {
    onChange(items.filter((i) => i.pdv_id !== pdvId))
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-4">Sin PDVs en la ruta. Agrégalos desde la lista de la izquierda.</p>
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.pdv_id)} strategy={verticalListSortingStrategy}>
        {items.map((item) => (
          <SortableItem key={item.pdv_id} item={item} onRemove={handleRemove} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

- [ ] **Step 3: Crear `components/admin/RutaSheet.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { rutaSchema } from '@/lib/validations/rutas'
import { useCreateRuta, useUpdateRuta, useRutaPDVs } from '@/lib/hooks/useRutas'
import { useColaboradoras } from '@/lib/hooks/useColaboradoras'
import { useZonas } from '@/lib/hooks/useZonas'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import { PDVSortableList, type PDVItem } from '@/components/admin/PDVSortableList'
import type { Database } from '@/lib/supabase/database.types'

type Ruta = Database['public']['Tables']['rutas']['Row']
type Tab = 'datos' | 'pdvs'
type FormInput = z.input<typeof rutaSchema>
type FormOutput = z.output<typeof rutaSchema>

const DIAS = [
  { value: 'lunes', label: 'Lun' },
  { value: 'martes', label: 'Mar' },
  { value: 'miercoles', label: 'Mié' },
  { value: 'jueves', label: 'Jue' },
  { value: 'viernes', label: 'Vie' },
  { value: 'sabado', label: 'Sáb' },
  { value: 'domingo', label: 'Dom' },
] as const

interface RutaSheetProps {
  open: boolean
  onClose: () => void
  ruta?: Ruta | null
}

export function RutaSheet({ open, onClose, ruta }: RutaSheetProps) {
  const { data: colaboradoras = [] } = useColaboradoras()
  const { data: zonas = [] } = useZonas()
  const { data: todosLosPdvs = [] } = usePuntosDeVenta()
  const { data: rutaPdvsExistentes = [] } = useRutaPDVs(ruta?.id)
  const createRuta = useCreateRuta()
  const updateRuta = useUpdateRuta()

  const [tab, setTab] = useState<Tab>('datos')
  const [pdvsEnRuta, setPdvsEnRuta] = useState<PDVItem[]>([])
  const [searchPdv, setSearchPdv] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(rutaSchema),
    defaultValues: { estado: 'activa', dias_visita: [] },
  })

  const diasSeleccionados = (watch('dias_visita') ?? []) as string[]

  useEffect(() => {
    if (!open) return
    setTab('datos')
    if (ruta) {
      reset({
        codigo: ruta.codigo,
        nombre: ruta.nombre,
        colaboradora_id: ruta.colaboradora_id ?? '',
        zona_id: ruta.zona_id ?? '',
        frecuencia: (ruta.frecuencia as FormInput['frecuencia']) ?? '',
        dias_visita: (ruta.dias_visita ?? []) as FormInput['dias_visita'],
        estado: ruta.estado as 'activa' | 'inactiva',
      })
      // Cargar PDVs existentes de la ruta
      setPdvsEnRuta(
        rutaPdvsExistentes.map((r) => ({
          pdv_id: r.pdv_id,
          nombre_comercial: (r.puntos_de_venta as any)?.nombre_comercial ?? r.pdv_id,
        }))
      )
    } else {
      reset({ estado: 'activa', dias_visita: [] })
      setPdvsEnRuta([])
    }
  }, [open, ruta, rutaPdvsExistentes, reset])

  function toggleDia(dia: string) {
    const current = diasSeleccionados
    if (current.includes(dia)) {
      setValue('dias_visita', current.filter((d) => d !== dia) as FormInput['dias_visita'])
    } else {
      setValue('dias_visita', [...current, dia] as FormInput['dias_visita'])
    }
  }

  const pdvsEnRutaIds = new Set(pdvsEnRuta.map((p) => p.pdv_id))
  const pdvsDisponibles = todosLosPdvs.filter(
    (p) => p.activo && !pdvsEnRutaIds.has(p.id) &&
      (!searchPdv || p.nombre_comercial.toLowerCase().includes(searchPdv.toLowerCase()))
  )

  function agregarPdv(pdvId: string, nombre: string) {
    setPdvsEnRuta((prev) => [...prev, { pdv_id: pdvId, nombre_comercial: nombre }])
  }

  async function onSubmit(values: FormOutput) {
    const pdvsList = pdvsEnRuta.map((p, i) => ({ pdv_id: p.pdv_id, orden_visita: i + 1 }))
    try {
      if (ruta) {
        await updateRuta.mutateAsync({ id: ruta.id, values, pdvs: pdvsList })
      } else {
        await createRuta.mutateAsync({ values, pdvs: pdvsList })
      }
      toast.success('Ruta guardada')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const isDuplicate = msg.includes('23505') || msg.includes('duplicate key') || msg.includes('unique')
      toast.error(isDuplicate ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{ruta ? 'Editar ruta' : 'Nueva ruta'}</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 mt-4 mb-4">
          {(['datos', 'pdvs'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'
              }`}
            >
              {t === 'datos' ? 'Datos' : `PDVs (${pdvsEnRuta.length})`}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Tab Datos */}
          {tab === 'datos' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Código *</label>
                <input {...register('codigo')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" placeholder="RUT-001" />
                {errors.codigo && <p className="mt-1 text-xs text-red-500">{errors.codigo.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <input {...register('nombre')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm" />
                {errors.nombre && <p className="mt-1 text-xs text-red-500">{errors.nombre.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Colaboradora *</label>
                <select {...register('colaboradora_id')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Selecciona una colaboradora</option>
                  {colaboradoras.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                {errors.colaboradora_id && <p className="mt-1 text-xs text-red-500">{errors.colaboradora_id.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium">Zona</label>
                <select {...register('zona_id')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Sin zona</option>
                  {zonas.map((z) => (
                    <option key={z.id} value={z.id}>{z.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Frecuencia</label>
                <select {...register('frecuencia')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option value="">Sin especificar</option>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="quincenal">Quincenal</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Días de visita</label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {DIAS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDia(value)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        diasSeleccionados.includes(value)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {ruta && (
                <div>
                  <label className="text-sm font-medium">Estado</label>
                  <select {...register('estado')} className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                    <option value="activa">Activa</option>
                    <option value="inactiva">Inactiva</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tab PDVs */}
          {tab === 'pdvs' && (
            <div className="grid grid-cols-2 gap-4">
              {/* Columna izquierda: disponibles */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">PDVs disponibles</p>
                <input
                  type="text"
                  value={searchPdv}
                  onChange={(e) => setSearchPdv(e.target.value)}
                  placeholder="Buscar PDV..."
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm mb-2"
                />
                <div className="max-h-80 overflow-y-auto space-y-1">
                  {pdvsDisponibles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => agregarPdv(p.id, p.nombre_comercial)}
                      className="w-full text-left px-3 py-2 rounded-md text-sm border border-slate-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                    >
                      {p.nombre_comercial}
                    </button>
                  ))}
                  {pdvsDisponibles.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">No hay PDVs disponibles</p>
                  )}
                </div>
              </div>

              {/* Columna derecha: en ruta (sortable) */}
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase mb-2">PDVs en la ruta</p>
                <div className="max-h-96 overflow-y-auto">
                  <PDVSortableList items={pdvsEnRuta} onChange={setPdvsEnRuta} />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add erp-vitrinas/components/admin/PDVSortableList.tsx \
        erp-vitrinas/components/admin/RutaSheet.tsx
git commit -m "feat: componentes RutaSheet con drag & drop de PDVs"
```

---

## Task 9: Página Rutas

**Files:**
- Create: `erp-vitrinas/app/(admin)/admin/rutas/page.tsx`

- [ ] **Step 1: Crear `app/(admin)/admin/rutas/page.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { RutaSheet } from '@/components/admin/RutaSheet'
import { useRutas } from '@/lib/hooks/useRutas'
import type { Database } from '@/lib/supabase/database.types'

type Ruta = Database['public']['Tables']['rutas']['Row'] & {
  usuarios: { nombre: string } | null
  zonas: { nombre: string } | null
  _pdv_count: number
}

export default function RutasPage() {
  const { data: rutas = [], isLoading } = useRutas()
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Ruta | null>(null)

  const filtered = useMemo(() =>
    rutas.filter((r) => {
      const matchSearch = !search ||
        r.codigo.toLowerCase().includes(search.toLowerCase()) ||
        r.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (r.usuarios?.nombre ?? '').toLowerCase().includes(search.toLowerCase())
      const matchEstado = filterEstado === 'todos' || r.estado === filterEstado
      return matchSearch && matchEstado
    }), [rutas, search, filterEstado])

  const columns = useMemo<Column<Ruta>[]>(() => [
    { key: 'codigo', header: 'Código', render: (r) => <span className="font-mono text-xs">{r.codigo}</span> },
    { key: 'nombre', header: 'Nombre', render: (r) => r.nombre },
    { key: 'colaboradora', header: 'Colaboradora', render: (r) => r.usuarios?.nombre ?? '—' },
    { key: 'zona', header: 'Zona', render: (r) => r.zonas?.nombre ?? '—' },
    { key: 'pdvs', header: 'PDVs', render: (r) => <span className="font-medium">{r._pdv_count}</span> },
    {
      key: 'estado',
      header: 'Estado',
      render: (r) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          r.estado === 'activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {r.estado}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (r) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(r as Ruta); setSheetOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
    },
  ], [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Rutas</h1>
        <Button onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1" /> Nueva ruta
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por código, nombre o colaboradora..." />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="rounded-md border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="todos">Todos</option>
          <option value="activa">Activa</option>
          <option value="inactiva">Inactiva</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        isLoading={isLoading}
        getRowKey={(r) => r.id}
        emptyMessage="No hay rutas registradas"
      />

      <RutaSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        ruta={editing as any}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verificar test**

```bash
npx playwright test tests/sprint2.spec.ts -g "navega a listado de rutas" --reporter=line
```

- [ ] **Step 3: Commit**

```bash
git add erp-vitrinas/app/\(admin\)/admin/rutas/
git commit -m "feat: listado de rutas con sheet crear/editar y DnD de PDVs"
```

---

## Task 10: Navegación — Actualizar AppSidebar

**Files:**
- Modify: `erp-vitrinas/components/admin/AppSidebar.tsx`

- [ ] **Step 1: Agregar 3 items al array NAV_ITEMS**

En `components/admin/AppSidebar.tsx`, modificar la sección de imports y el array:

```typescript
import {
  LayoutDashboard,
  Package,
  Store,
  Users,
  Boxes,       // ← nuevo
  Warehouse,   // ← nuevo
  MapPin,      // ← nuevo
  LogOut,
} from 'lucide-react'
```

```typescript
const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/productos',   icon: Package,         label: 'Productos' },
  { href: '/admin/vitrinas',    icon: Boxes,           label: 'Vitrinas' },         // ← nuevo
  { href: '/admin/inventario',  icon: Warehouse,       label: 'Inventario' },       // ← nuevo
  { href: '/admin/rutas',       icon: MapPin,          label: 'Rutas' },            // ← nuevo
  { href: '/admin/puntos-de-venta', icon: Store,       label: 'Puntos de Venta' },
  { href: '/admin/usuarios',    icon: Users,           label: 'Usuarios', adminOnly: true },
]
```

- [ ] **Step 2: Verificar visualmente que el sidebar tiene los nuevos items**

```bash
npm run dev
```
Abrir `http://localhost:3000/admin/dashboard` y verificar 3 nuevos íconos en el sidebar.

- [ ] **Step 3: Commit**

```bash
git add erp-vitrinas/components/admin/AppSidebar.tsx
git commit -m "feat: agregar Vitrinas, Inventario y Rutas al sidebar admin"
```

---

## Task 11: Tests e2e completos + lint + type-check

**Files:**
- Modify: `erp-vitrinas/tests/sprint2.spec.ts`

- [ ] **Step 1: Completar `tests/sprint2.spec.ts` con todos los flujos**

Reemplazar el contenido del archivo con la suite completa:

```typescript
import { test, expect } from '@playwright/test'

// Helper de login reutilizable
async function loginAdmin(page: import('@playwright/test').Page) {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'admin@erp.local')
  await page.fill('input[name="password"]', 'Admin1234!')
  await page.click('button[type="submit"]')
  await page.waitForURL('/admin/dashboard')
}

test.describe('Sprint 2 — Vitrinas', () => {
  test.beforeEach(({ page }) => loginAdmin(page))

  test('navega a listado de vitrinas', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await expect(page.getByRole('heading', { name: 'Vitrinas' })).toBeVisible()
  })

  test('crea una vitrina', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await page.click('button:has-text("Nueva vitrina")')
    await page.fill('input[name="codigo"]', 'VIT-E2E-01')
    await page.locator('select[name="pdv_id"]').selectOption({ index: 1 })
    await page.click('button[type="submit"]')
    await expect(page.getByText('Vitrina guardada')).toBeVisible()
    await expect(page.getByText('VIT-E2E-01')).toBeVisible()
  })

  test('navega al detalle de una vitrina y ve los tres tabs', async ({ page }) => {
    await page.goto('/admin/vitrinas')
    await page.click('button[title="Ver detalle"]')
    await expect(page.getByRole('tab', { name: 'Info' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Surtido estándar' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Inventario actual' })).toBeVisible()
  })
})

test.describe('Sprint 2 — Inventario Central', () => {
  test.beforeEach(({ page }) => loginAdmin(page))

  test('navega a inventario central', async ({ page }) => {
    await page.goto('/admin/inventario')
    await expect(page.getByRole('heading', { name: 'Inventario Central' })).toBeVisible()
  })

  test('registra una entrada al inventario', async ({ page }) => {
    await page.goto('/admin/inventario')
    await page.click('button:has-text("Registrar entrada")')
    await page.locator('select[name="producto_id"]').selectOption({ index: 1 })
    await page.fill('input[name="cantidad"]', '10')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Entrada registrada')).toBeVisible()
  })
})

test.describe('Sprint 2 — Rutas', () => {
  test.beforeEach(({ page }) => loginAdmin(page))

  test('navega a listado de rutas', async ({ page }) => {
    await page.goto('/admin/rutas')
    await expect(page.getByRole('heading', { name: 'Rutas' })).toBeVisible()
  })

  test('crea una ruta con datos básicos', async ({ page }) => {
    await page.goto('/admin/rutas')
    await page.click('button:has-text("Nueva ruta")')
    await page.fill('input[name="codigo"]', 'RUT-E2E-01')
    await page.fill('input[name="nombre"]', 'Ruta de prueba E2E')
    await page.locator('select[name="colaboradora_id"]').selectOption({ index: 1 })
    await page.click('button[type="submit"]')
    await expect(page.getByText('Ruta guardada')).toBeVisible()
    await expect(page.getByText('RUT-E2E-01')).toBeVisible()
  })
})
```

- [ ] **Step 2: Correr todos los tests del sprint**

```bash
npx playwright test tests/sprint2.spec.ts --reporter=line
```
Esperado: todos los tests PASS.

- [ ] **Step 3: Type-check y lint**

```bash
npm run type-check
npm run lint
```
Esperado: sin errores.

- [ ] **Step 4: Commit final**

```bash
git add erp-vitrinas/tests/sprint2.spec.ts
git commit -m "test: e2e Sprint 2 — vitrinas, inventario central y rutas"
```

---

## Task 12: Actualizar SPRINTS.md + PR

- [ ] **Step 1: Actualizar SPRINTS.md — marcar tareas como completadas**

En el archivo `SPRINTS.md` del repo raíz, actualizar el Sprint 2:

- Cambiar `[ ]` → `[x]` para S2-01 a S2-07
- Agregar entrada al Log de Progreso:

```
| 2026-03-21 | Sprint 2 | Completado | Vitrinas (listado + detalle con tabs), surtido estándar, inventario actual, inventario central (entrada por compra), rutas con DnD de PDVs. dnd-kit instalado. |
```

- [ ] **Step 2: Commit de documentación**

```bash
git add SPRINTS.md
git commit -m "docs: marcar Sprint 2 como completado en SPRINTS.md"
```

- [ ] **Step 3: Abrir PR a develop (o main si develop no existe aún)**

```bash
git push origin feature/sprint2-vitrinas-inventario-rutas
gh pr create \
  --base develop \
  --title "feat: Sprint 2 — Vitrinas, Inventario Central y Rutas" \
  --body "## Sprint 2 completado

### Módulos implementados
- **Vitrinas:** listado + sheet crear/editar + página de detalle con tabs (Info, Surtido estándar, Inventario actual) + retiro con confirmación
- **Inventario Central:** listado valorizado + sheet entrada por compra (tipo='compra' con trigger automático)
- **Rutas:** listado + sheet con dos tabs — datos y PDVs ordenables con drag & drop (dnd-kit)

### Dependencias nuevas
- \`@dnd-kit/core\` + \`@dnd-kit/sortable\` + \`@dnd-kit/utilities\`

### Tests
- 7 tests e2e Playwright en \`tests/sprint2.spec.ts\` (todos pasando)

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
