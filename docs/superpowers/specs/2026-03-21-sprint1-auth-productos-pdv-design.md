# Spec: Sprint 1 — Autenticación + Productos + PDV

| Campo | Detalle |
|---|---|
| Fecha | 2026-03-21 |
| Sprint | S1 |
| HUs | HU-01, HU-02, HU-03, HU-04, HU-05, HU-06, HU-07, HU-08 |
| Estado | Aprobado para implementación |

---

## Objetivo

Login funcional con redirección por rol, CRUD completo de productos y categorías, y gestión de puntos de venta. Es la base sobre la que se construyen todos los sprints posteriores.

---

## Decisiones de diseño visual

| Decisión | Elección |
|---|---|
| Paleta | Profesional oscuro: navbar/sidebar `#1e293b`, contenido `#f8fafc` |
| Login | Card oscura centrada sobre fondo `#0f172a` |
| Admin layout | Sidebar colapsado de íconos (Lucide React), se expande al hover |
| Formularios CRUD | Sheet lateral (slide-over) de shadcn/ui |
| Acento activo | `#6366f1` (índigo) para ítem seleccionado en sidebar |

---

## Enfoque técnico

**All-Client con React Query (TanStack Query v5)**

- Todas las páginas del admin son Client Components (`"use client"`)
- Todo el fetching vive en hooks (`lib/hooks/`) usando `useQuery` / `useMutation`
- Mutaciones que requieren `SUPABASE_SERVICE_ROLE_KEY` (crear usuarios) van a Server Actions
- El layout `app/(admin)/layout.tsx` es Server Component solo para leer la sesión server-side y redirigir si no hay usuario
- `QueryClientProvider` en `app/layout.tsx` con `staleTime: 60_000`

---

## Estructura de archivos

### Rutas nuevas

```
app/
  (admin)/
    layout.tsx                   # Server Component: verifica sesión, renderiza AppShell
    dashboard/page.tsx           # Placeholder — KPIs en Fase 2
    productos/page.tsx           # Listado de productos con búsqueda y filtros
    categorias/page.tsx          # Listado de categorías
    puntos-de-venta/page.tsx     # Listado de PDV
    usuarios/page.tsx            # CRUD usuarios (solo visible para rol admin)
  login/page.tsx                 # Reemplaza placeholder actual
```

### Componentes nuevos

```
components/
  admin/
    AppShell.tsx                 # Wrapper: navbar + sidebar + children
    AppSidebar.tsx               # Sidebar colapsado con íconos y tooltips
    DataTable.tsx                # Tabla reutilizable: columns, data, isLoading, onEdit
    SearchInput.tsx              # Input con debounce 300ms
    ProductoSheet.tsx            # Sheet crear/editar producto
    CategoriaSheet.tsx           # Sheet crear/editar categoría
    PuntoDeVentaSheet.tsx        # Sheet crear/editar PDV
    UsuarioSheet.tsx             # Sheet crear/editar usuario
```

### Hooks actualizados (reemplazan stubs)

```
lib/hooks/
  useProductos.ts                # useQuery + useMutation para productos
  useCategorias.ts               # useQuery + useMutation para categorías (nuevo)
  usePuntosDeVenta.ts            # useQuery + useMutation para PDV (nuevo)
  useZonas.ts                    # useQuery solo lectura para select de zonas (nuevo)
  useUsuarios.ts                 # useQuery + useMutation para usuarios
```

### Validaciones actualizadas (reemplazan stubs)

```
lib/validations/
  productos.ts                   # productoSchema Zod
  categorias.ts                  # categoriaSchema Zod (nuevo)
  puntos-de-venta.ts             # puntoDeVentaSchema Zod (nuevo)
  usuarios.ts                    # usuarioSchema Zod
```

---

## Módulo de Autenticación

### Login (`app/login/page.tsx`)

- Client Component
- Estado local: `email`, `password`, `loading`, `error`
- Llama `supabase.auth.signInWithPassword({ email, password })`
- En éxito: lee `session.user.app_metadata.rol` (sincronizado al JWT por el trigger `on_auth_user_created` y `on_usuario_rol_changed`):
  - `colaboradora` → `router.push('/campo/ruta-del-dia')`
  - cualquier otro rol → `router.push('/admin/dashboard')`
- El rol siempre estará en `app_metadata` porque el trigger de DB lo sincroniza automáticamente al crear o editar usuarios
- Error de Supabase: se muestra inline bajo el botón, no como toast
- Usuario ya autenticado que llega a `/login`: el middleware lo redirige (ya implementado en Fase 0)

### Middleware

- Ya implementado en `middleware.ts` durante Fase 0
- Protege `/admin/*` y `/campo/*`, redirige a `/login` sin sesión
- No requiere cambios

### Sesión persistente

- Manejada automáticamente por `@supabase/ssr` vía cookies
- `lib/supabase/client.ts` (createBrowserClient) y `lib/supabase/server.ts` (createServerClient) ya configurados en Fase 0

### Logout

- Server Action `logoutAction()` definida en `app/actions/auth.ts` (archivo con `"use server"` — no puede definirse dentro de un Client Component)
- `AppShell.tsx` importa y llama `logoutAction` desde ese archivo
- Llama `supabase.auth.signOut()` + `redirect('/login')`
- Botón en la parte inferior del sidebar o en dropdown del avatar

### Layout admin (`app/(admin)/layout.tsx`)

- Server Component
- Llama `supabase.auth.getUser()` server-side
- Sin sesión → `redirect('/login')` (segunda capa de protección además del middleware)
- Con sesión → renderiza `<AppShell user={user}>` pasando nombre y rol

---

## AppShell y AppSidebar

### `AppShell.tsx`

- Recibe `user: { nombre, rol }` como prop
- Estructura: flex row con `AppSidebar` a la izquierda y `<main>` a la derecha
- Navbar superior con: logo POWERP, nombre del usuario, botón logout

### `AppSidebar.tsx`

- Sidebar oscuro (`bg-[#1e293b]`), ancho colapsado ~56px
- Íconos Lucide React con `Tooltip` de shadcn al hacer hover
- Items Sprint 1: Dashboard, Productos, Puntos de Venta, Usuarios
- Item activo: fondo `bg-[#6366f1]` redondeado; inactivo: `text-slate-400`
- Usa `usePathname()` para detectar ruta activa
- Sprint 2 agrega: Vitrinas, Inventario, Rutas (se añaden al array de nav items)

---

## Módulo de Productos

### `useProductos.ts`

```typescript
// Queries
useProductos(filters?)    // .select('*, categorias(nombre)') con filtros opcionales
useProducto(id)           // .select('*').eq('id', id).single()

// Mutations — invalidan ['productos'] al resolver
useCreateProducto()       // .insert()
useUpdateProducto()       // .update().eq('id', id)
useToggleProductoEstado() // .update({ estado }).eq('id', id) — optimistic update
```

### Página `/admin/productos`

- `SearchInput` con debounce 300ms filtra por `nombre` o `codigo` (client-side sobre los datos ya cargados)
- Select de categoría filtra por `categoria_id`
- Select de estado filtra por `activo | inactivo | todos`
- `DataTable` con columnas: Código · Nombre · Categoría · Precio venta · Costo · Estado · Acciones
- Columna Estado: `Switch` de shadcn que llama `useToggleProductoEstado()` con optimistic update
- Botón "Nuevo producto" abre `ProductoSheet` en modo creación

> **Nota de tipos:** La tabla `productos` usa `estado TEXT CHECK IN ('activo','inactivo')`, no boolean. La tabla `categorias` usa `activo BOOLEAN`. El campo `forma_pago_preferida` de PDV tiene CHECK constraint: `('efectivo','transferencia','nequi','daviplata','otro')` — debe ser un Select, no texto libre.

### `ProductoSheet.tsx`

- Prop `producto?: Producto` — si se pasa, modo edición; si no, modo creación
- React Hook Form + Zod (`productoSchema`)
- Campos:
  - `codigo`: string único — validación async contra DB solo al hacer blur
  - `nombre`: string requerido
  - `categoria_id`: Select poblado con `useCategorias()`
  - `descripcion`: textarea opcional
  - `costo_compra`: number ≥ 0
  - `precio_venta_comercio`: number ≥ 0, debe ser ≥ costo_compra
  - `unidad_medida`: string (ej. "unidad", "par")
  - `estado`: select activo/inactivo (default: activo)
- Submit: llama `useCreateProducto()` o `useUpdateProducto()`
- En éxito: invalidar query `['productos']` + cerrar sheet + toast "Producto guardado"
- Error de constraint UNIQUE: mensaje "Este código ya existe"

### `productoSchema` (Zod)

```typescript
z.object({
  codigo: z.string().min(1).max(50),
  nombre: z.string().min(1).max(200),
  categoria_id: z.string().uuid(),
  descripcion: z.string().optional(),
  costo_compra: z.number().min(0),
  precio_venta_comercio: z.number().min(0),
  unidad_medida: z.string().min(1),
  estado: z.enum(['activo', 'inactivo']).default('activo'),
}).refine(
  (d) => d.precio_venta_comercio >= d.costo_compra,
  { message: 'El precio de venta debe ser mayor o igual al costo', path: ['precio_venta_comercio'] }
)
```

---

## Módulo de Categorías

### `useCategorias.ts`

```typescript
useCategorias()          // .select('*').eq('activo', true) — para selects
useAllCategorias()       // .select('*') — para página de administración
useCreateCategoria()
useUpdateCategoria()
useToggleCategoriaActivo()
```

### Página `/admin/categorias`

- Tabla: Nombre · Descripción · Estado · Acciones
- Sheet con campos: `nombre`, `descripcion`, `activo`
- Sin búsqueda en tiempo real (volumen bajo)

---

## Módulo de Puntos de Venta

### `usePuntosDeVenta.ts`

```typescript
usePuntosDeVenta(filters?)   // .select('*, zonas(nombre)')
useCreatePuntoDeVenta()
useUpdatePuntoDeVenta()
useTogglePdvActivo()
```

### `useZonas.ts`

```typescript
useZonas()   // .select('id, nombre') solo lectura para poblar selects
```

### Página `/admin/puntos-de-venta`

- `SearchInput` filtra por `nombre_comercial` o `codigo`
- Select de zona filtra por `zona_id`
- `DataTable` columnas: Código · Nombre comercial · Tipo · Zona · Contacto · Forma de pago · Estado · Acciones

### `PuntoDeVentaSheet.tsx`

- `puntoDeVentaSchema` Zod
- Campos:
  - `codigo`: string único
  - `nombre_comercial`: string requerido
  - `tipo`: string (ej. "tienda", "farmacia", "supermercado")
  - `direccion`: string
  - `zona_id`: Select poblado con `useZonas()`
  - `contacto_nombre`: string opcional
  - `contacto_tel`: string opcional
  - `condiciones_pago`: string opcional
  - `forma_pago_preferida`: Select con valores `efectivo | transferencia | nequi | daviplata | otro` (CHECK constraint en DB)
  - `activo`: boolean (default: true)
- `lat`/`lng` no incluidos en Sprint 1 (Fase 3 agrega mapa)

---

## Módulo de Usuarios

### Restricción de acceso

- Link "Usuarios" en sidebar solo visible si `user.rol === 'admin'`
- Página `/admin/usuarios/` verifica rol en render y muestra `null` si no es admin

### `useUsuarios.ts`

```typescript
useUsuarios()           // .select('*') desde tabla usuarios
useCreateUsuario()      // Server Action (requiere service role)
useUpdateUsuario()      // .update() en tabla usuarios (nombre, rol, activo)
```

> **Eliminación de usuarios fuera de alcance en Sprint 1.** Solo se permite cambiar `activo = false` (desactivar). El `onDelete` del `DataTable` no aplica a este módulo — ese prop es opcional.

### Server Action `createUsuarioAction()`

Ubicación: `app/actions/usuarios.ts`

```typescript
// 1. Llama supabase.auth.admin.createUser({ email, password, user_metadata: { nombre } })
//    El trigger on_auth_user_created inserta en public.usuarios con rol='colaboradora'
// 2. Si el rol deseado ≠ 'colaboradora', actualiza public.usuarios.rol
//    El trigger on_usuario_rol_changed sincroniza el rol a app_metadata automáticamente
// 3. Devuelve { data, error }
// Nota: el email no se pasa a user_metadata — ya lo captura el trigger desde auth.users.email
```

### `UsuarioSheet.tsx`

- Modo creación: campos `nombre`, `email`, `rol`, `password` temporal
- Modo edición: campos `nombre`, `rol`, `activo` (email no editable)
- `usuarioSchema` Zod con `rol: z.enum(['admin','colaboradora','supervisor','analista','compras'])`

---

## Componentes compartidos

### `DataTable.tsx`

```typescript
interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  isLoading: boolean
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void  // opcional — no todos los módulos tienen delete
}
```

- Skeleton rows (5 filas) mientras `isLoading === true`
- Paginación client-side: 20 filas por página
- Sin server-side pagination en Sprint 1

### `SearchInput.tsx`

```typescript
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}
// Debounce interno de 300ms con useEffect
```

### Estados de carga y error globales

- `isLoading` → skeleton en tabla, spinner en botón submit
- `isPending` (mutación) → botón submit deshabilitado + spinner
- Errores de mutación → `toast({ variant: 'destructive', title: 'Error', description: err.message })`
- Errores de constraint UNIQUE → mensaje traducido inline

---

## Dependencias nuevas a instalar

```bash
# React Hook Form (formularios)
npm install react-hook-form @hookform/resolvers

# shadcn components a agregar
npx shadcn@latest add sheet toast switch tooltip skeleton
```

> TanStack Query, Zod y shadcn Button ya están instalados.

---

## Tareas del sprint (referencia)

| ID | Tarea | Módulo |
|---|---|---|
| S1-01 | Página login email/contraseña | Auth |
| S1-02 | Redirección post-login por rol | Auth |
| S1-03 | Middleware protección de rutas | Auth (ya implementado) |
| S1-04 | Logout | Auth |
| S1-05 | CRUD usuarios con roles | Usuarios |
| S1-06 | Listado productos con búsqueda y filtros | Productos |
| S1-07 | Formulario creación producto | Productos |
| S1-08 | Edición producto | Productos |
| S1-09 | Activar/desactivar producto | Productos |
| S1-10 | CRUD categorías | Categorías |
| S1-11 | Listado y formulario PDV | PDV |

---

## Definition of Done para Sprint 1

- [ ] Login funciona con email/contraseña y redirige correctamente según rol
- [ ] Rutas `/admin/*` redirigen a `/login` sin sesión activa
- [ ] CRUD completo de productos: crear, editar, activar/desactivar, listar con filtros
- [ ] CRUD completo de categorías
- [ ] CRUD completo de PDV con datos de contacto
- [ ] CRUD de usuarios (solo admin puede acceder)
- [ ] Todos los formularios validan con Zod antes de enviar
- [ ] Errores de Supabase se muestran al usuario de forma legible
- [ ] `npm run type-check` pasa sin errores
- [ ] `npm run lint` pasa sin errores
