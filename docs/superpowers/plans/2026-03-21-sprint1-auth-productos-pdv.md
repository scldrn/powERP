# Sprint 1: Auth + Productos + PDV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login funcional con redirección por rol, panel admin con sidebar de íconos colapsado, y CRUD completo de Productos, Categorías, Puntos de Venta y Usuarios.

**Architecture:** All-client con React Query v5. Los hooks en `lib/hooks/` usan `useQuery`/`useMutation` contra Supabase JS client. El layout `(admin)` es Server Component que verifica sesión y pasa el usuario al AppShell (Client Component). Las Server Actions que requieren `SUPABASE_SERVICE_ROLE_KEY` viven en `app/actions/`.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2 + `@supabase/ssr`, TanStack React Query v5, React Hook Form + `@hookform/resolvers` + Zod, shadcn/ui (slate), Lucide React, Vitest + jsdom.

**Working directory:** Todos los comandos se ejecutan desde `erp-vitrinas/`.

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `vitest.config.ts` | Crear | Configuración Vitest con jsdom |
| `app/layout.tsx` | Modificar | Agregar `QueryClientProvider` |
| `app/actions/auth.ts` | Crear | `logoutAction()` Server Action |
| `app/actions/usuarios.ts` | Crear | `createUsuarioAction()` Server Action |
| `app/login/page.tsx` | Reemplazar stub | Formulario login con Supabase Auth |
| `app/(admin)/layout.tsx` | Reemplazar stub | Verifica sesión, renderiza AppShell |
| `app/(admin)/dashboard/page.tsx` | Reemplazar stub | Placeholder KPIs |
| `app/(admin)/productos/page.tsx` | Crear | Listado productos + búsqueda + filtros |
| `app/(admin)/categorias/page.tsx` | Crear | Listado categorías |
| `app/(admin)/puntos-de-venta/page.tsx` | Crear | Listado PDV + búsqueda + filtros |
| `app/(admin)/usuarios/page.tsx` | Crear | CRUD usuarios (solo admin) |
| `components/admin/AppShell.tsx` | Crear | Layout wrapper: navbar + sidebar + main |
| `components/admin/AppSidebar.tsx` | Crear | Sidebar colapsado íconos con tooltips |
| `components/admin/DataTable.tsx` | Crear | Tabla reutilizable con skeleton y paginación |
| `components/admin/SearchInput.tsx` | Crear | Input con debounce 300ms |
| `components/admin/ProductoSheet.tsx` | Crear | Sheet crear/editar producto |
| `components/admin/CategoriaSheet.tsx` | Crear | Sheet crear/editar categoría |
| `components/admin/PuntoDeVentaSheet.tsx` | Crear | Sheet crear/editar PDV |
| `components/admin/UsuarioSheet.tsx` | Crear | Sheet crear/editar usuario |
| `lib/hooks/useProductos.ts` | Reemplazar stub | useQuery + useMutation para productos |
| `lib/hooks/useCategorias.ts` | Crear | useQuery + useMutation para categorías |
| `lib/hooks/usePuntosDeVenta.ts` | Crear | useQuery + useMutation para PDV |
| `lib/hooks/useZonas.ts` | Crear | useQuery solo lectura zonas |
| `lib/hooks/useUsuarios.ts` | Reemplazar stub | useQuery + useMutation para usuarios |
| `lib/validations/productos.ts` | Reemplazar stub | Zod schema productos |
| `lib/validations/categorias.ts` | Crear | Zod schema categorías |
| `lib/validations/puntos-de-venta.ts` | Crear | Zod schema PDV |
| `lib/validations/usuarios.ts` | Reemplazar stub | Zod schema usuarios |

---

## Task 1: Dependencias + Vitest + shadcn components

**Files:**
- Create: `erp-vitrinas/vitest.config.ts`
- Modify: `erp-vitrinas/package.json` (scripts)

- [ ] **Step 1: Instalar dependencias de formularios y test**

```bash
npm install react-hook-form @hookform/resolvers
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 2: Agregar shadcn components**

```bash
npx shadcn@latest add sheet
npx shadcn@latest add sonner
npx shadcn@latest add switch
npx shadcn@latest add tooltip
npx shadcn@latest add skeleton
npx shadcn@latest add badge
```

- [ ] **Step 3: Crear `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
```

- [ ] **Step 4: Crear `vitest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Agregar scripts de test a `package.json`**

En el objeto `"scripts"`, agregar:
```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 6: Verificar que vitest corre**

```bash
npx vitest run
```
Expected: `No test files found` (sin errores de configuración).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts vitest.setup.ts package.json package-lock.json components/ui/
git commit -m "chore: setup Vitest, shadcn components y react-hook-form"
```

---

## Task 2: Validaciones Zod (TDD)

**Files:**
- Create: `lib/validations/__tests__/validations.test.ts`
- Modify: `lib/validations/productos.ts` (reemplaza stub `null`)
- Create: `lib/validations/categorias.ts`
- Create: `lib/validations/puntos-de-venta.ts`
- Modify: `lib/validations/usuarios.ts` (reemplaza stub)

- [ ] **Step 1: Escribir tests fallidos para todos los schemas**

Crear `lib/validations/__tests__/validations.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { productoSchema } from '../productos'
import { categoriaSchema } from '../categorias'
import { puntoDeVentaSchema } from '../puntos-de-venta'
import { usuarioCreateSchema } from '../usuarios'

const UUID = '00000000-0000-0000-0000-000000000001'

describe('productoSchema', () => {
  const base = {
    codigo: 'AUD-001',
    nombre: 'Audífono Bluetooth X1',
    categoria_id: UUID,
    costo_compra: 15000,
    precio_venta_comercio: 25000,
    unidad_medida: 'unidad',
    estado: 'activo' as const,
  }

  it('valida un producto correcto', () => {
    expect(productoSchema.safeParse(base).success).toBe(true)
  })

  it('falla cuando precio_venta < costo_compra', () => {
    const result = productoSchema.safeParse({ ...base, precio_venta_comercio: 10000 })
    expect(result.success).toBe(false)
    const err = result as { success: false; error: { issues: { path: string[] }[] } }
    expect(err.error.issues[0].path).toContain('precio_venta_comercio')
  })

  it('falla con codigo vacío', () => {
    expect(productoSchema.safeParse({ ...base, codigo: '' }).success).toBe(false)
  })

  it('falla con categoria_id inválido', () => {
    expect(productoSchema.safeParse({ ...base, categoria_id: 'no-uuid' }).success).toBe(false)
  })

  it('acepta descripcion opcional ausente', () => {
    const { descripcion: _, ...sinDesc } = { ...base, descripcion: undefined }
    expect(productoSchema.safeParse(sinDesc).success).toBe(true)
  })
})

describe('categoriaSchema', () => {
  it('valida categoría correcta', () => {
    expect(categoriaSchema.safeParse({ nombre: 'Audífonos' }).success).toBe(true)
  })
  it('falla con nombre vacío', () => {
    expect(categoriaSchema.safeParse({ nombre: '' }).success).toBe(false)
  })
})

describe('puntoDeVentaSchema', () => {
  const base = {
    codigo: 'PDV-001',
    nombre_comercial: 'Tienda El Centro',
    zona_id: UUID,
  }
  it('valida PDV mínimo válido', () => {
    expect(puntoDeVentaSchema.safeParse(base).success).toBe(true)
  })
  it('falla con forma_pago_preferida inválida', () => {
    expect(puntoDeVentaSchema.safeParse({ ...base, forma_pago_preferida: 'bitcoin' }).success).toBe(false)
  })
  it('acepta forma_pago_preferida válida', () => {
    expect(puntoDeVentaSchema.safeParse({ ...base, forma_pago_preferida: 'nequi' }).success).toBe(true)
  })
})

describe('usuarioCreateSchema', () => {
  it('valida usuario correcto', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María García',
      email: 'maria@ejemplo.com',
      password: 'secreto123',
      rol: 'colaboradora',
    }).success).toBe(true)
  })
  it('falla con rol inválido', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María',
      email: 'maria@ejemplo.com',
      password: 'secreto123',
      rol: 'superadmin',
    }).success).toBe(false)
  })
  it('falla con email inválido', () => {
    expect(usuarioCreateSchema.safeParse({
      nombre: 'María',
      email: 'no-es-email',
      password: 'secreto123',
      rol: 'colaboradora',
    }).success).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar tests — deben fallar**

```bash
npx vitest run lib/validations/__tests__/validations.test.ts
```
Expected: FAIL (imports no resueltos).

- [ ] **Step 3: Implementar `lib/validations/productos.ts`**

```typescript
import { z } from 'zod'

export const productoSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  categoria_id: z.string().uuid('Selecciona una categoría'),
  descripcion: z.string().optional(),
  costo_compra: z.number().min(0, 'El costo no puede ser negativo'),
  precio_venta_comercio: z.number().min(0, 'El precio no puede ser negativo'),
  unidad_medida: z.string().min(1, 'La unidad es requerida'),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
}).refine(
  (d) => d.precio_venta_comercio >= d.costo_compra,
  {
    message: 'El precio de venta debe ser mayor o igual al costo de compra',
    path: ['precio_venta_comercio'],
  }
)

export type ProductoFormValues = z.infer<typeof productoSchema>
```

- [ ] **Step 4: Implementar `lib/validations/categorias.ts`**

```typescript
import { z } from 'zod'

export const categoriaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  descripcion: z.string().optional(),
  activo: z.boolean().default(true),
})

export type CategoriaFormValues = z.infer<typeof categoriaSchema>
```

- [ ] **Step 5: Implementar `lib/validations/puntos-de-venta.ts`**

```typescript
import { z } from 'zod'

const FORMAS_PAGO = ['efectivo', 'transferencia', 'nequi', 'daviplata', 'otro'] as const

export const puntoDeVentaSchema = z.object({
  codigo: z.string().min(1, 'El código es requerido').max(50),
  nombre_comercial: z.string().min(1, 'El nombre es requerido').max(200),
  tipo: z.string().optional(),
  direccion: z.string().optional(),
  zona_id: z.string().uuid('Selecciona una zona').optional().nullable(),
  contacto_nombre: z.string().optional(),
  contacto_tel: z.string().optional(),
  condiciones_pago: z.string().optional(),
  forma_pago_preferida: z.enum(FORMAS_PAGO).optional().nullable(),
  activo: z.boolean().default(true),
})

export type PuntoDeVentaFormValues = z.infer<typeof puntoDeVentaSchema>
```

- [ ] **Step 6: Implementar `lib/validations/usuarios.ts`**

```typescript
import { z } from 'zod'

const ROLES = ['admin', 'colaboradora', 'supervisor', 'analista', 'compras'] as const

export const usuarioCreateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  rol: z.enum(ROLES, { errorMap: () => ({ message: 'Rol inválido' }) }),
})

export const usuarioUpdateSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(200),
  rol: z.enum(ROLES),
  activo: z.boolean(),
})

export type UsuarioCreateValues = z.infer<typeof usuarioCreateSchema>
export type UsuarioUpdateValues = z.infer<typeof usuarioUpdateSchema>
```

- [ ] **Step 7: Ejecutar tests — deben pasar**

```bash
npx vitest run lib/validations/__tests__/validations.test.ts
```
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/validations/
git commit -m "feat: validaciones Zod para productos, categorías, PDV y usuarios"
```

---

## Task 3: QueryClientProvider + Server Actions

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/actions/auth.ts`
- Create: `app/actions/usuarios.ts`
- Create: `lib/providers.tsx`

- [ ] **Step 1: Crear `lib/providers.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
          },
        },
      })
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
```

- [ ] **Step 2: Modificar `app/layout.tsx` para agregar Providers**

Reemplazar el contenido de `app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Powerp — ERP Vitrinas',
  description: 'Sistema ERP-CRM para gestión de vitrinas en consignación',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Crear `app/actions/auth.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 4: Crear `app/actions/usuarios.ts`**

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

type Rol = Database['public']['Tables']['usuarios']['Row']['rol']

export async function createUsuarioAction(data: {
  nombre: string
  email: string
  password: string
  rol: Rol
}) {
  // El cliente admin usa service role — nunca exponer en el cliente
  const adminSupabase = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Crear usuario en auth (el trigger on_auth_user_created inserta en public.usuarios con rol='colaboradora')
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    user_metadata: { nombre: data.nombre },
    email_confirm: true,
  })

  if (authError) return { error: authError.message }

  // 2. Si el rol no es 'colaboradora', actualizarlo
  //    El trigger on_usuario_rol_changed sincroniza el rol a app_metadata automáticamente
  if (data.rol !== 'colaboradora') {
    const { error: updateError } = await adminSupabase
      .from('usuarios')
      .update({ rol: data.rol })
      .eq('id', authData.user.id)

    if (updateError) return { error: updateError.message }
  }

  return { data: authData.user, error: null }
}

export async function updateUsuarioAction(
  id: string,
  data: { nombre: string; rol: Rol; activo: boolean }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('usuarios')
    .update({ nombre: data.nombre, rol: data.rol, activo: data.activo })
    .eq('id', id)

  if (error) return { error: error.message }
  return { error: null }
}
```

- [ ] **Step 5: Verificar que compila**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 6: Commit**

```bash
git add app/layout.tsx lib/providers.tsx app/actions/
git commit -m "feat: QueryClientProvider, Toaster y Server Actions de auth y usuarios"
```

---

## Task 4: Página de Login

**Files:**
- Modify: `app/login/page.tsx`

- [ ] **Step 1: Reemplazar `app/login/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
      return
    }

    const rol = data.user.app_metadata?.rol as string | undefined
    router.push(rol === 'colaboradora' ? '/campo/ruta-del-dia' : '/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#1e293b] rounded-xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-xl font-bold text-slate-100 tracking-widest">POWERP</h1>
          <p className="text-xs text-slate-500 mt-1">Gestión de Vitrinas</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs text-slate-400 mb-1.5">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#0f172a] border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs text-slate-400 mb-1.5">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#0f172a] border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium mt-2"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Verificar que compila**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 3: Verificar visualmente**

```bash
npm run dev
```
Abrir `http://localhost:3000/login`. Debe mostrar la card oscura centrada.

- [ ] **Step 4: Commit**

```bash
git add app/login/page.tsx
git commit -m "feat: página de login con Supabase Auth y redirección por rol"
```

---

## Task 5: AppShell + AppSidebar

**Files:**
- Create: `components/admin/AppSidebar.tsx`
- Create: `components/admin/AppShell.tsx`

- [ ] **Step 1: Crear `components/admin/AppSidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  Store,
  Users,
  LogOut,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { logoutAction } from '@/app/actions/auth'

interface NavItem {
  href: string
  icon: React.ElementType
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/productos', icon: Package, label: 'Productos' },
  { href: '/admin/puntos-de-venta', icon: Store, label: 'Puntos de Venta' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios', adminOnly: true },
]

interface AppSidebarProps {
  rol: string
}

export function AppSidebar({ rol }: AppSidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => !item.adminOnly || rol === 'admin')

  return (
    <aside className="flex flex-col w-14 min-h-screen bg-[#1e293b] py-4 shrink-0">
      <nav className="flex flex-col items-center gap-2 flex-1">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-700 hover:text-slate-100'
                  }`}
                >
                  <Icon size={18} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="flex flex-col items-center pb-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-100 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </form>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Cerrar sesión
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Crear `components/admin/AppShell.tsx`**

```typescript
'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from './AppSidebar'

interface AppShellProps {
  children: React.ReactNode
  user: {
    nombre: string
    email: string
    rol: string
  }
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        <AppSidebar rol={user.rol} />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Navbar superior */}
          <header className="h-12 bg-[#1e293b] flex items-center justify-between px-4 shrink-0">
            <span className="text-xs font-bold text-slate-100 tracking-widest">POWERP</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{user.nombre || user.email}</span>
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                {(user.nombre || user.email).charAt(0).toUpperCase()}
              </div>
            </div>
          </header>
          {/* Contenido */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/AppSidebar.tsx components/admin/AppShell.tsx
git commit -m "feat: AppShell y AppSidebar con navegación colapsada por íconos"
```

---

## Task 6: Admin Layout + Dashboard placeholder

**Files:**
- Modify: `app/(admin)/layout.tsx`
- Modify: `app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Reemplazar `app/(admin)/layout.tsx`**

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/admin/AppShell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Obtener nombre desde public.usuarios
  const { data: perfil } = await supabase
    .from('usuarios')
    .select('nombre, rol')
    .eq('id', user.id)
    .single()

  const userInfo = {
    nombre: perfil?.nombre ?? '',
    email: user.email ?? '',
    rol: (user.app_metadata?.rol as string) ?? perfil?.rol ?? 'colaboradora',
  }

  return <AppShell user={userInfo}>{children}</AppShell>
}
```

- [ ] **Step 2: Reemplazar `app/(admin)/dashboard/page.tsx`**

```typescript
export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">Dashboard</h1>
      <p className="text-slate-500 text-sm">Métricas y KPIs disponibles en Fase 2.</p>
    </div>
  )
}
```

- [ ] **Step 3: Verificar que `/admin/dashboard` carga el shell correctamente**

```bash
npm run dev
```
Navegar a `http://localhost:3000/admin/dashboard` (con sesión activa). Debe mostrar sidebar + navbar + contenido.

- [ ] **Step 4: Commit**

```bash
git add "app/(admin)/layout.tsx" "app/(admin)/dashboard/page.tsx"
git commit -m "feat: layout admin con verificación de sesión server-side y AppShell"
```

---

## Task 7: Componentes compartidos — DataTable y SearchInput

**Files:**
- Create: `components/admin/DataTable.tsx`
- Create: `components/admin/SearchInput.tsx`

- [ ] **Step 1: Crear `components/admin/SearchInput.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

// onChange se llama con el valor debounced (300ms).
// El padre almacena el valor debounced para filtrar datos.
export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue)
    }, 300)
    return () => clearTimeout(timer)
  }, [localValue, onChange])

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  )
}
```

- [ ] **Step 2: Crear `components/admin/DataTable.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  isLoading?: boolean
  pageSize?: number
  emptyMessage?: string
}

const DEFAULT_PAGE_SIZE = 20

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pageSize = DEFAULT_PAGE_SIZE,
  emptyMessage = 'No hay registros',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(data.length / pageSize)
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize)

  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-slate-400 text-sm">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            pageData.map((row, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-700 ${col.className ?? ''}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
          <span className="text-xs text-slate-500">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/DataTable.tsx components/admin/SearchInput.tsx
git commit -m "feat: DataTable reutilizable con skeleton y paginación, SearchInput con debounce"
```

---

## Task 8: Hooks de datos

**Files:**
- Modify: `lib/hooks/useProductos.ts`
- Create: `lib/hooks/useCategorias.ts`
- Create: `lib/hooks/usePuntosDeVenta.ts`
- Create: `lib/hooks/useZonas.ts`
- Modify: `lib/hooks/useUsuarios.ts`

- [ ] **Step 1: Reemplazar `lib/hooks/useProductos.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { ProductoFormValues } from '@/lib/validations/productos'

type Producto = Database['public']['Tables']['productos']['Row'] & {
  categorias: { nombre: string } | null
}

const QUERY_KEY = ['productos'] as const

export function useProductos() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('productos')
        .select('*, categorias(nombre)')
        .order('nombre')
      if (error) throw new Error(error.message)
      return data as Producto[]
    },
  })
}

export function useCreateProducto() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: ProductoFormValues) => {
      const { error } = await supabase.from('productos').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateProducto() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ProductoFormValues> }) => {
      const { error } = await supabase.from('productos').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useToggleProductoEstado() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: 'activo' | 'inactivo' }) => {
      const { error } = await supabase.from('productos').update({ estado }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onMutate: async ({ id, estado }) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<Producto[]>(QUERY_KEY)
      queryClient.setQueryData<Producto[]>(QUERY_KEY, (old) =>
        old?.map((p) => (p.id === id ? { ...p, estado } : p))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(QUERY_KEY, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

- [ ] **Step 2: Crear `lib/hooks/useCategorias.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import type { CategoriaFormValues } from '@/lib/validations/categorias'

type Categoria = Database['public']['Tables']['categorias']['Row']

const QUERY_KEY = ['categorias'] as const

export function useCategorias() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('categorias').select('*').order('nombre')
      if (error) throw new Error(error.message)
      return data as Categoria[]
    },
  })
}

// Solo categorías activas — para selects en formularios
export function useCategoriasActivas() {
  const supabase = createClient()
  return useQuery({
    queryKey: [...QUERY_KEY, 'activas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')
      if (error) throw new Error(error.message)
      return data
    },
  })
}

export function useCreateCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: CategoriaFormValues) => {
      const { error } = await supabase.from('categorias').insert(values)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateCategoria() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<CategoriaFormValues> }) => {
      const { error } = await supabase.from('categorias').update(values).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

- [ ] **Step 3: Crear `lib/hooks/usePuntosDeVenta.ts`**

```typescript
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
```

- [ ] **Step 4: Crear `lib/hooks/useZonas.ts`**

```typescript
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
```

- [ ] **Step 5: Reemplazar `lib/hooks/useUsuarios.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/lib/supabase/database.types'
import { createUsuarioAction, updateUsuarioAction } from '@/app/actions/usuarios'
import type { UsuarioCreateValues, UsuarioUpdateValues } from '@/lib/validations/usuarios'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const QUERY_KEY = ['usuarios'] as const

export function useUsuarios() {
  const supabase = createClient()
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.from('usuarios').select('*').order('nombre')
      if (error) throw new Error(error.message)
      return data as Usuario[]
    },
  })
}

export function useCreateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: UsuarioCreateValues) => {
      const result = await createUsuarioAction(values)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useUpdateUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: UsuarioUpdateValues }) => {
      const result = await updateUsuarioAction(id, values)
      if (result.error) throw new Error(result.error)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
```

- [ ] **Step 6: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 7: Commit**

```bash
git add lib/hooks/
git commit -m "feat: hooks React Query para productos, categorías, PDV, zonas y usuarios"
```

---

## Task 9: Módulo Productos

**Files:**
- Create: `components/admin/ProductoSheet.tsx`
- Create: `app/(admin)/productos/page.tsx`

- [ ] **Step 1: Crear `components/admin/ProductoSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { productoSchema, type ProductoFormValues } from '@/lib/validations/productos'
import { useCreateProducto, useUpdateProducto } from '@/lib/hooks/useProductos'
import { useCategoriasActivas } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Producto = Database['public']['Tables']['productos']['Row']

interface ProductoSheetProps {
  open: boolean
  onClose: () => void
  producto?: Producto | null
}

export function ProductoSheet({ open, onClose, producto }: ProductoSheetProps) {
  const { data: categorias = [] } = useCategoriasActivas()
  const createProducto = useCreateProducto()
  const updateProducto = useUpdateProducto()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductoFormValues>({
    resolver: zodResolver(productoSchema),
    defaultValues: { estado: 'activo', costo_compra: 0, precio_venta_comercio: 0 },
  })

  useEffect(() => {
    if (producto) {
      reset({
        codigo: producto.codigo,
        nombre: producto.nombre,
        categoria_id: producto.categoria_id ?? '',
        descripcion: producto.descripcion ?? '',
        costo_compra: Number(producto.costo_compra ?? 0),
        precio_venta_comercio: Number(producto.precio_venta_comercio),
        unidad_medida: producto.unidad_medida ?? 'unidad',
        estado: producto.estado as 'activo' | 'inactivo',
      })
    } else {
      reset({ estado: 'activo', costo_compra: 0, precio_venta_comercio: 0, unidad_medida: 'unidad' })
    }
  }, [producto, reset])

  async function onSubmit(values: ProductoFormValues) {
    try {
      if (producto) {
        await updateProducto.mutateAsync({ id: producto.id, values })
        toast.success('Producto actualizado')
      } else {
        await createProducto.mutateAsync(values)
        toast.success('Producto creado')
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      const display = msg.includes('unique') ? 'Este código ya existe' : msg
      toast.error(display)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{producto ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <Field label="Código *" error={errors.codigo?.message}>
            <input {...register('codigo')} className={inputCls} placeholder="AUD-001" disabled={!!producto} />
          </Field>

          <Field label="Nombre *" error={errors.nombre?.message}>
            <input {...register('nombre')} className={inputCls} placeholder="Audífono Bluetooth X1" />
          </Field>

          <Field label="Categoría *" error={errors.categoria_id?.message}>
            <select {...register('categoria_id')} className={inputCls}>
              <option value="">Seleccionar...</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Costo compra *" error={errors.costo_compra?.message}>
              <input
                {...register('costo_compra', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
            <Field label="Precio venta *" error={errors.precio_venta_comercio?.message}>
              <input
                {...register('precio_venta_comercio', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Unidad de medida *" error={errors.unidad_medida?.message}>
            <input {...register('unidad_medida')} className={inputCls} placeholder="unidad" />
          </Field>

          <Field label="Descripción" error={errors.descripcion?.message}>
            <textarea {...register('descripcion')} className={`${inputCls} min-h-[80px] resize-none`} />
          </Field>

          <Field label="Estado" error={errors.estado?.message}>
            <select {...register('estado')} className={inputCls}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </Field>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// Helpers locales
const inputCls =
  'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/productos/page.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { ProductoSheet } from '@/components/admin/ProductoSheet'
import { useProductos, useToggleProductoEstado } from '@/lib/hooks/useProductos'
import { useCategorias } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Producto = Database['public']['Tables']['productos']['Row'] & {
  categorias: { nombre: string } | null
}

export default function ProductosPage() {
  const { data: productos = [], isLoading } = useProductos()
  const { data: categorias = [] } = useCategorias()
  const toggleEstado = useToggleProductoEstado()

  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null)

  const filtered = useMemo(() => {
    return productos.filter((p) => {
      const matchSearch =
        !search ||
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
      const matchCat = !filterCategoria || p.categoria_id === filterCategoria
      const matchEstado =
        filterEstado === 'todos' || p.estado === filterEstado
      return matchSearch && matchCat && matchEstado
    })
  }, [productos, search, filterCategoria, filterEstado])

  function handleToggle(producto: Producto) {
    const nuevoEstado = producto.estado === 'activo' ? 'inactivo' : 'activo'
    toggleEstado.mutate(
      { id: producto.id, estado: nuevoEstado },
      {
        onError: () => toast.error('Error al cambiar estado'),
      }
    )
  }

  const columns: Column<Producto>[] = [
    { key: 'codigo', header: 'Código', render: (p) => <span className="font-mono text-xs">{p.codigo}</span> },
    { key: 'nombre', header: 'Nombre', render: (p) => p.nombre },
    { key: 'categoria', header: 'Categoría', render: (p) => p.categorias?.nombre ?? '—' },
    {
      key: 'precio',
      header: 'Precio venta',
      render: (p) => `$${Number(p.precio_venta_comercio).toLocaleString('es-CO')}`,
      className: 'text-right',
    },
    {
      key: 'costo',
      header: 'Costo',
      render: (p) => `$${Number(p.costo_compra ?? 0).toLocaleString('es-CO')}`,
      className: 'text-right',
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => (
        <div className="flex items-center gap-2">
          <Switch
            checked={p.estado === 'activo'}
            onCheckedChange={() => handleToggle(p)}
          />
          <Badge variant={p.estado === 'activo' ? 'default' : 'secondary'} className="text-xs">
            {p.estado}
          </Badge>
        </div>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (p) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setEditingProducto(p); setSheetOpen(true) }}
        >
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Productos</h1>
          <p className="text-sm text-slate-500 mt-1">{productos.length} productos en catálogo</p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-500"
          onClick={() => { setEditingProducto(null); setSheetOpen(true) }}
        >
          <Plus size={16} className="mr-1.5" /> Nuevo producto
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nombre o código..."
          className="max-w-xs"
        />
        <select
          value={filterCategoria}
          onChange={(e) => setFilterCategoria(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="todos">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <ProductoSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        producto={editingProducto}
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/ProductoSheet.tsx "app/(admin)/productos/"
git commit -m "feat: módulo Productos — listado con búsqueda, filtros y sheet crear/editar"
```

---

## Task 10: Módulo Categorías

**Files:**
- Create: `components/admin/CategoriaSheet.tsx`
- Create: `app/(admin)/categorias/page.tsx`

- [ ] **Step 1: Crear `components/admin/CategoriaSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { categoriaSchema, type CategoriaFormValues } from '@/lib/validations/categorias'
import { useCreateCategoria, useUpdateCategoria } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Categoria = Database['public']['Tables']['categorias']['Row']

interface CategoriaSheetProps {
  open: boolean
  onClose: () => void
  categoria?: Categoria | null
}

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export function CategoriaSheet({ open, onClose, categoria }: CategoriaSheetProps) {
  const create = useCreateCategoria()
  const update = useUpdateCategoria()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CategoriaFormValues>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { activo: true },
  })

  useEffect(() => {
    if (categoria) {
      reset({ nombre: categoria.nombre, descripcion: categoria.descripcion ?? '', activo: categoria.activo })
    } else {
      reset({ nombre: '', descripcion: '', activo: true })
    }
  }, [categoria, reset])

  async function onSubmit(values: CategoriaFormValues) {
    try {
      if (categoria) {
        await update.mutateAsync({ id: categoria.id, values })
        toast.success('Categoría actualizada')
      } else {
        await create.mutateAsync(values)
        toast.success('Categoría creada')
      }
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{categoria ? 'Editar categoría' : 'Nueva categoría'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
            <input {...register('nombre')} className={inputCls} placeholder="Audífonos" />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
            <textarea {...register('descripcion')} className={`${inputCls} min-h-[80px] resize-none`} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="cat-activo" {...register('activo')} className="rounded" />
            <label htmlFor="cat-activo" className="text-sm text-slate-600">Categoría activa</label>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/categorias/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { CategoriaSheet } from '@/components/admin/CategoriaSheet'
import { useCategorias } from '@/lib/hooks/useCategorias'
import type { Database } from '@/lib/supabase/database.types'

type Categoria = Database['public']['Tables']['categorias']['Row']

export default function CategoriasPage() {
  const { data: categorias = [], isLoading } = useCategorias()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Categoria | null>(null)

  const columns: Column<Categoria>[] = [
    { key: 'nombre', header: 'Nombre', render: (c) => c.nombre },
    { key: 'descripcion', header: 'Descripción', render: (c) => c.descripcion ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (c) => (
        <Badge variant={c.activo ? 'default' : 'secondary'}>{c.activo ? 'Activa' : 'Inactiva'}</Badge>
      ),
    },
    {
      key: 'acciones',
      header: '',
      render: (c) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setSheetOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Categorías</h1>
          <p className="text-sm text-slate-500 mt-1">{categorias.length} categorías</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nueva categoría
        </Button>
      </div>
      <DataTable columns={columns} data={categorias} isLoading={isLoading} />
      <CategoriaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} categoria={editing} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/CategoriaSheet.tsx "app/(admin)/categorias/"
git commit -m "feat: módulo Categorías — listado y sheet crear/editar"
```

---

## Task 11: Módulo Puntos de Venta

**Files:**
- Create: `components/admin/PuntoDeVentaSheet.tsx`
- Create: `app/(admin)/puntos-de-venta/page.tsx`

- [ ] **Step 1: Crear `components/admin/PuntoDeVentaSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { puntoDeVentaSchema, type PuntoDeVentaFormValues } from '@/lib/validations/puntos-de-venta'
import { useCreatePuntoDeVenta, useUpdatePuntoDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import { useZonas } from '@/lib/hooks/useZonas'
import type { Database } from '@/lib/supabase/database.types'

type PDV = Database['public']['Tables']['puntos_de_venta']['Row']

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

interface PuntoDeVentaSheetProps {
  open: boolean
  onClose: () => void
  pdv?: PDV | null
}

export function PuntoDeVentaSheet({ open, onClose, pdv }: PuntoDeVentaSheetProps) {
  const { data: zonas = [] } = useZonas()
  const create = useCreatePuntoDeVenta()
  const update = useUpdatePuntoDeVenta()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PuntoDeVentaFormValues>({
    resolver: zodResolver(puntoDeVentaSchema),
    defaultValues: { activo: true },
  })

  useEffect(() => {
    if (pdv) {
      reset({
        codigo: pdv.codigo,
        nombre_comercial: pdv.nombre_comercial,
        tipo: pdv.tipo ?? '',
        direccion: pdv.direccion ?? '',
        zona_id: pdv.zona_id ?? undefined,
        contacto_nombre: pdv.contacto_nombre ?? '',
        contacto_tel: pdv.contacto_tel ?? '',
        condiciones_pago: pdv.condiciones_pago ?? '',
        forma_pago_preferida: (pdv.forma_pago_preferida as PuntoDeVentaFormValues['forma_pago_preferida']) ?? undefined,
        activo: pdv.activo,
      })
    } else {
      reset({ activo: true })
    }
  }, [pdv, reset])

  async function onSubmit(values: PuntoDeVentaFormValues) {
    try {
      if (pdv) {
        await update.mutateAsync({ id: pdv.id, values })
        toast.success('Punto de venta actualizado')
      } else {
        await create.mutateAsync(values)
        toast.success('Punto de venta creado')
      }
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(msg.includes('unique') ? 'Este código ya existe' : msg)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{pdv ? 'Editar punto de venta' : 'Nuevo punto de venta'}</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Código *</label>
              <input {...register('codigo')} className={inputCls} placeholder="PDV-001" disabled={!!pdv} />
              {errors.codigo && <p className="text-xs text-red-500 mt-1">{errors.codigo.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
              <input {...register('tipo')} className={inputCls} placeholder="Tienda, Farmacia..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre comercial *</label>
            <input {...register('nombre_comercial')} className={inputCls} />
            {errors.nombre_comercial && <p className="text-xs text-red-500 mt-1">{errors.nombre_comercial.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Zona</label>
            <select {...register('zona_id')} className={inputCls}>
              <option value="">Sin zona</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Dirección</label>
            <input {...register('direccion')} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contacto</label>
              <input {...register('contacto_nombre')} className={inputCls} placeholder="Nombre" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
              <input {...register('contacto_tel')} className={inputCls} placeholder="300..." />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Forma de pago preferida</label>
            <select {...register('forma_pago_preferida')} className={inputCls}>
              <option value="">Sin preferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/puntos-de-venta/page.tsx`**

```typescript
'use client'

import { useState, useMemo } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { SearchInput } from '@/components/admin/SearchInput'
import { PuntoDeVentaSheet } from '@/components/admin/PuntoDeVentaSheet'
import { usePuntosDeVenta } from '@/lib/hooks/usePuntosDeVenta'
import type { Database } from '@/lib/supabase/database.types'

type PDV = Database['public']['Tables']['puntos_de_venta']['Row'] & {
  zonas: { nombre: string } | null
}

export default function PuntosDeVentaPage() {
  const { data: pdvs = [], isLoading } = usePuntosDeVenta()
  const [search, setSearch] = useState('')
  const [filterZona, setFilterZona] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PDV | null>(null)

  const filtered = useMemo(() =>
    pdvs.filter((p) => {
      const matchSearch =
        !search ||
        p.nombre_comercial.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo.toLowerCase().includes(search.toLowerCase())
      const matchZona = !filterZona || p.zonas?.nombre === filterZona
      return matchSearch && matchZona
    }), [pdvs, search, filterZona])

  const columns: Column<PDV>[] = [
    { key: 'codigo', header: 'Código', render: (p) => <span className="font-mono text-xs">{p.codigo}</span> },
    { key: 'nombre', header: 'Nombre comercial', render: (p) => p.nombre_comercial },
    { key: 'tipo', header: 'Tipo', render: (p) => p.tipo ?? '—' },
    { key: 'zona', header: 'Zona', render: (p) => p.zonas?.nombre ?? '—' },
    { key: 'contacto', header: 'Contacto', render: (p) => p.contacto_nombre ?? '—' },
    { key: 'pago', header: 'Forma de pago', render: (p) => p.forma_pago_preferida ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => <Badge variant={p.activo ? 'default' : 'secondary'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'acciones',
      header: '',
      render: (p) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(p as PDV); setSheetOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Puntos de Venta</h1>
          <p className="text-sm text-slate-500 mt-1">{pdvs.length} puntos de venta</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nuevo PDV
        </Button>
      </div>

      <div className="flex gap-3 mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre o código..." className="max-w-xs" />
        <select
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las zonas</option>
          {pdvs
            .filter((p) => p.zonas)
            .map((p) => p.zonas!)
            .filter((z, i, arr) => arr.findIndex((x) => x.nombre === z.nombre) === i)
            .map((z) => <option key={z.nombre} value={z.nombre}>{z.nombre}</option>)
          }
        </select>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />
      <PuntoDeVentaSheet open={sheetOpen} onClose={() => setSheetOpen(false)} pdv={editing} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/PuntoDeVentaSheet.tsx "app/(admin)/puntos-de-venta/"
git commit -m "feat: módulo Puntos de Venta — listado con búsqueda, filtro de zona y sheet crear/editar"
```

---

## Task 12: Módulo Usuarios

**Files:**
- Create: `components/admin/UsuarioSheet.tsx`
- Create: `app/(admin)/usuarios/page.tsx`

- [ ] **Step 1: Crear `components/admin/UsuarioSheet.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  type UsuarioCreateValues,
  type UsuarioUpdateValues,
} from '@/lib/validations/usuarios'
import { useCreateUsuario, useUpdateUsuario } from '@/lib/hooks/useUsuarios'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const ROLES = ['admin', 'colaboradora', 'supervisor', 'analista', 'compras'] as const
const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

interface UsuarioSheetProps {
  open: boolean
  onClose: () => void
  usuario?: Usuario | null
}

export function UsuarioSheet({ open, onClose, usuario }: UsuarioSheetProps) {
  const createUsuario = useCreateUsuario()
  const updateUsuario = useUpdateUsuario()
  const isEditing = !!usuario

  const createForm = useForm<UsuarioCreateValues>({
    resolver: zodResolver(usuarioCreateSchema),
  })
  const updateForm = useForm<UsuarioUpdateValues>({
    resolver: zodResolver(usuarioUpdateSchema),
  })

  useEffect(() => {
    if (usuario) {
      updateForm.reset({ nombre: usuario.nombre, rol: usuario.rol as UsuarioUpdateValues['rol'], activo: usuario.activo })
    } else {
      createForm.reset()
    }
  }, [usuario, createForm, updateForm])

  async function onCreateSubmit(values: UsuarioCreateValues) {
    try {
      await createUsuario.mutateAsync(values)
      toast.success('Usuario creado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario')
    }
  }

  async function onUpdateSubmit(values: UsuarioUpdateValues) {
    if (!usuario) return
    try {
      await updateUsuario.mutateAsync({ id: usuario.id, values })
      toast.success('Usuario actualizado')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar usuario')
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</SheetTitle>
        </SheetHeader>

        {isEditing ? (
          <form onSubmit={updateForm.handleSubmit(onUpdateSubmit)} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo (no editable)</label>
              <input value={usuario?.email ?? ''} disabled className={`${inputCls} bg-slate-50 text-slate-400`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input {...updateForm.register('nombre')} className={inputCls} />
              {updateForm.formState.errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{updateForm.formState.errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
              <select {...updateForm.register('rol')} className={inputCls}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" {...updateForm.register('activo')} className="rounded" />
              <label htmlFor="activo" className="text-sm text-slate-600">Usuario activo</label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500" disabled={updateForm.formState.isSubmitting}>
                {updateForm.formState.isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4 mt-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
              <input {...createForm.register('nombre')} className={inputCls} />
              {createForm.formState.errors.nombre && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.nombre.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Correo electrónico *</label>
              <input {...createForm.register('email')} type="email" className={inputCls} />
              {createForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contraseña temporal *</label>
              <input {...createForm.register('password')} type="password" className={inputCls} />
              {createForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.password.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol *</label>
              <select {...createForm.register('rol')} className={inputCls}>
                <option value="">Seleccionar rol...</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              {createForm.formState.errors.rol && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.rol.message}</p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Creando...' : 'Crear usuario'}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

- [ ] **Step 2: Crear `app/(admin)/usuarios/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/admin/DataTable'
import { UsuarioSheet } from '@/components/admin/UsuarioSheet'
import { useUsuarios } from '@/lib/hooks/useUsuarios'
import type { Database } from '@/lib/supabase/database.types'

type Usuario = Database['public']['Tables']['usuarios']['Row']

const ROL_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  supervisor: 'bg-orange-100 text-orange-700',
  analista: 'bg-blue-100 text-blue-700',
  compras: 'bg-purple-100 text-purple-700',
  colaboradora: 'bg-green-100 text-green-700',
}

export default function UsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)

  const columns: Column<Usuario>[] = [
    { key: 'nombre', header: 'Nombre', render: (u) => u.nombre },
    { key: 'email', header: 'Correo', render: (u) => <span className="text-slate-500">{u.email}</span> },
    {
      key: 'rol',
      header: 'Rol',
      render: (u) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROL_COLORS[u.rol] ?? 'bg-slate-100 text-slate-700'}`}>
          {u.rol}
        </span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (u) => <Badge variant={u.activo ? 'default' : 'secondary'}>{u.activo ? 'Activo' : 'Inactivo'}</Badge>,
    },
    {
      key: 'acciones',
      header: '',
      render: (u) => (
        <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setSheetOpen(true) }}>
          <Pencil size={14} />
        </Button>
      ),
      className: 'w-12',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Usuarios</h1>
          <p className="text-sm text-slate-500 mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={() => { setEditing(null); setSheetOpen(true) }}>
          <Plus size={16} className="mr-1.5" /> Nuevo usuario
        </Button>
      </div>
      <DataTable columns={columns} data={usuarios} isLoading={isLoading} />
      <UsuarioSheet open={sheetOpen} onClose={() => setSheetOpen(false)} usuario={editing} />
    </div>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npm run type-check
```
Expected: Sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/admin/UsuarioSheet.tsx "app/(admin)/usuarios/"
git commit -m "feat: módulo Usuarios — listado y sheet crear/editar con Server Actions"
```

---

## Task 13: Verificación final

- [ ] **Step 1: Ejecutar todos los tests**

```bash
npx vitest run
```
Expected: All tests PASS.

- [ ] **Step 2: Type-check completo**

```bash
npm run type-check
```
Expected: Sin errores TypeScript.

- [ ] **Step 3: Lint**

```bash
npm run lint
```
Expected: Sin errores ESLint.

- [ ] **Step 4: Build de producción**

```bash
npm run build
```
Expected: Build exitoso sin errores.

- [ ] **Step 5: Actualizar SPRINTS.md**

Marcar todas las tareas de Sprint 1 como `[x]` completado y el estado general como `[x]` completado.
Agregar una línea al Log de Progreso:

```
| 2026-03-21 | Sprint 1 | Completado | Auth, shell admin, CRUD productos/categorías/PDV/usuarios. React Query all-client. |
```

- [ ] **Step 6: Commit final y push**

```bash
git add SPRINTS.md
git commit -m "chore: marcar Sprint 1 como completado en SPRINTS.md"
git push
```
