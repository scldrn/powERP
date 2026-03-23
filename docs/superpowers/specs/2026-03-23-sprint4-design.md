# Sprint 4 Design — Cierre de Visita: Cobro + Reposición + Fotos

**Fecha:** 2026-03-23
**Sprint:** 4
**HUs cubiertas:** HU-20, HU-21, HU-22, HU-23, HU-24
**Tareas SPRINTS.md:** S4-01 a S4-07

---

## Contexto

Sprint 4 completa el flujo de visita de campo. Sprint 3 dejó a la colaboradora en estado `en_ejecucion` con el conteo guardado y el monto calculado visible. Sprint 4 agrega los pasos post-conteo: cobro → reposición → fotos → cierre.

Además corrige un error de diseño del modelo de inventario: actualmente solo existe `inventario_central` (del admin). El negocio requiere dos inventarios: central (bodega) y colaboradora (lo que lleva en campo). El admin transfiere stock al inventario de cada colaboradora; ella repone vitrinas desde su propio inventario.

---

## Decisiones de diseño

1. **Flujo post-conteo en página única:** La misma `/campo/visita/[id]` extiende su máquina de estados con etapas locales `'cobro' | 'reposicion' | 'fotos' | 'confirmar_cierre'`. Sin cambios de URL. Sin stepper visual complejo. Header oscuro + dots discretos + badge "Paso X de 4" (variante A, aprobada).

2. **Cierre de visita vía RPC PostgreSQL:** La función `cerrar_visita()` envuelve en una sola transacción: actualizar `detalle_visita.unidades_repuestas`, insertar `movimientos_inventario` de reposición, insertar `cobros`, actualizar `visitas.estado = 'completada'`. Más simple que Edge Function, atómico, sigue el patrón de funciones SQL existentes.

3. **Inventario colaboradora en `movimientos_inventario`:** La tabla ya tiene modelo origen/destino genérico (`origen_tipo`, `destino_tipo`). Se extienden los CHECK constraints para soportar `'colaboradora'`. No se crea tabla separada de _transferencias_ — los movimientos central→colaboradora y colaboradora→vitrina van en `movimientos_inventario`. Sí se crea `inventario_colaboradora` como tabla de estado denormalizado (equivalente a `inventario_vitrina` e `inventario_central`).

4. **`cobros.forma_pago`:** Actualmente es `TEXT CHECK (forma_pago IN ('efectivo',...))`. Se migra a `forma_pago_id UUID FK → formas_pago`. Los datos existentes se preservan con una migración que hace seed de `formas_pago` y reasigna FKs.

5. **`cobros.notas`:** El campo existente sirve para la nota de discrepancia. No se agrega columna nueva.

6. **Fotos:** Solo foto post-reposición (tipo `'despues'`). La tabla `fotos_visita` ya existe.

7. **`detalle_visita.unidades_repuestas`:** Ya existe, seteado a `0` en Sprint 3. Sprint 4 lo actualiza con la cantidad real repuesta.

8. **Formas de pago en sidebar:** Entran bajo una sección "Configuración" nueva, no a nivel raíz.

9. **Tab "Colaboradoras":** Vive en `/admin/inventario` como segunda pestaña junto a "Central" (contenido actual).

---

## Esquema de datos

### Tablas nuevas

**`formas_pago`**
```sql
CREATE TABLE formas_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Seed inicial:
INSERT INTO formas_pago (nombre) VALUES
  ('Efectivo'), ('Transferencia'), ('Nequi'), ('Daviplata'), ('Otro');
```

**`inventario_colaboradora`**
```sql
CREATE TABLE inventario_colaboradora (
  colaboradora_id UUID NOT NULL REFERENCES usuarios(id),
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad_actual INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_actual >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (colaboradora_id, producto_id)
);
```

### Extensiones a tablas existentes

**`movimientos_inventario`** — ampliar CHECK constraints:
```sql
-- Agregar 'colaboradora' a origen_tipo y destino_tipo
ALTER TABLE movimientos_inventario
  DROP CONSTRAINT movimientos_inventario_origen_tipo_check,
  ADD CONSTRAINT movimientos_inventario_origen_tipo_check
    CHECK (origen_tipo IN ('central', 'vitrina', 'colaboradora'));

ALTER TABLE movimientos_inventario
  DROP CONSTRAINT movimientos_inventario_destino_tipo_check,
  ADD CONSTRAINT movimientos_inventario_destino_tipo_check
    CHECK (destino_tipo IN ('central', 'vitrina', 'colaboradora'));

-- Agregar nuevos tipos
ALTER TABLE movimientos_inventario
  DROP CONSTRAINT movimientos_inventario_tipo_check,
  ADD CONSTRAINT movimientos_inventario_tipo_check
    CHECK (tipo IN (
      'compra', 'traslado_a_vitrina', 'venta', 'devolucion_garantia',
      'baja', 'ajuste', 'traslado_entre_vitrinas',
      'carga_colaboradora', 'reposicion'
    ));
```

Semántica:
- `tipo = 'carga_colaboradora'`: `origen_tipo = 'central'`, `destino_tipo = 'colaboradora'`, `destino_id = colaboradora_id`
- `tipo = 'reposicion'`: `origen_tipo = 'colaboradora'`, `origen_id = colaboradora_id`, `destino_tipo = 'vitrina'`, `destino_id = vitrina_id`

**`cobros`** — migrar `forma_pago` TEXT a FK:
```sql
-- 1. Agregar columna FK (nullable temporalmente)
ALTER TABLE cobros ADD COLUMN forma_pago_id UUID REFERENCES formas_pago(id);

-- 2. Poblar con seed (requiere que formas_pago ya exista)
UPDATE cobros c SET forma_pago_id = fp.id
FROM formas_pago fp WHERE LOWER(fp.nombre) = LOWER(c.forma_pago);

-- 3. Fallback: cobros sin match → asignar 'Otro' para no bloquear el NOT NULL
UPDATE cobros SET forma_pago_id = (SELECT id FROM formas_pago WHERE nombre = 'Otro' LIMIT 1)
WHERE forma_pago_id IS NULL;

-- 4. Hacer NOT NULL y eliminar columna legacy
ALTER TABLE cobros ALTER COLUMN forma_pago_id SET NOT NULL;
ALTER TABLE cobros DROP COLUMN forma_pago;
```

### Trigger extendido: `actualizar_inventario()`

El trigger existente se extiende para manejar `inventario_colaboradora`:

```sql
-- En actualizar_inventario(): agregar AFTER INSERT handler para
-- tipo = 'carga_colaboradora' y tipo = 'reposicion'

-- carga_colaboradora: suma a inventario_colaboradora, resta de inventario_central
-- reposicion: resta de inventario_colaboradora, suma a inventario_vitrina
-- NOTA: inventario_colaboradora solo se escribe vía trigger, nunca directamente por el cliente.
```

### Validación de stock de colaboradora

```sql
-- Nuevo trigger BEFORE INSERT en movimientos_inventario para tipo = 'reposicion':
-- Verifica que inventario_colaboradora.cantidad_actual >= NEW.cantidad
-- Si no: RAISE EXCEPTION 'Stock insuficiente en inventario de colaboradora'
```

### RLS nuevas tablas

```sql
-- formas_pago
CREATE POLICY "fp_select" ON formas_pago FOR SELECT TO authenticated USING (true);
CREATE POLICY "fp_admin" ON formas_pago FOR ALL TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');

-- inventario_colaboradora
CREATE POLICY "inv_col_select" ON inventario_colaboradora FOR SELECT TO authenticated
  USING (get_my_rol() = 'admin' OR colaboradora_id = auth.uid());
-- Solo admin puede escribir directamente; la colaboradora escribe SOLO vía trigger (SECURITY DEFINER)
CREATE POLICY "inv_col_write_admin" ON inventario_colaboradora FOR INSERT TO authenticated
  WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "inv_col_update_admin" ON inventario_colaboradora FOR UPDATE TO authenticated
  USING (get_my_rol() = 'admin') WITH CHECK (get_my_rol() = 'admin');
CREATE POLICY "inv_col_delete_admin" ON inventario_colaboradora FOR DELETE TO authenticated
  USING (get_my_rol() = 'admin');
```

### Función RPC: `cerrar_visita()`

```sql
CREATE OR REPLACE FUNCTION cerrar_visita(
  p_visita_id UUID,
  p_cobro JSONB,          -- { monto: number, forma_pago_id: uuid, notas?: string }
  p_reposiciones JSONB    -- [{ producto_id: uuid, unidades_repuestas: int }]
) RETURNS void AS $$
-- 1. Verificar que la visita existe, está en 'en_ejecucion' y colaboradora_id = auth.uid()
-- 2. Calcular monto total con calcular_monto_visita(p_visita_id) — fuente de verdad del servidor
-- 3. Determinar estado cobro: si p_cobro.monto != monto_calculado → 'discrepancia', else 'registrado'
-- 4. Si estado = 'discrepancia' y p_cobro.notas IS NULL o trim('') → RAISE EXCEPTION 'Nota obligatoria'
-- 5. Por cada item en p_reposiciones: UPDATE detalle_visita SET unidades_repuestas WHERE visita_id AND producto_id
-- 6. Por cada item con unidades_repuestas > 0: INSERT movimientos_inventario (tipo='reposicion', origen_tipo='colaboradora', origen_id=colaboradora_id, destino_tipo='vitrina', destino_id=vitrina_id)
--    → trigger valida stock y actualiza inventario_colaboradora - y inventario_vitrina +
-- 7. INSERT cobros (visita_id, monto=p_cobro.monto, forma_pago_id, estado, notas)
-- 8. UPDATE visitas SET estado='completada', fecha_hora_fin=now(), monto_calculado=monto_calculado_paso2
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Migraciones (en orden)

| # | Archivo | Contenido |
|---|---------|-----------|
| 1 | `20260013_formas_pago.sql` | Tabla + seed + RLS + trigger updated_at |
| 2 | `20260014_inventario_colaboradora.sql` | Tabla + RLS + trigger updated_at |
| 3 | `20260015_movimientos_extend.sql` | Ampliar CHECK constraints |
| 4 | `20260016_cobros_forma_pago_fk.sql` | Migrar forma_pago TEXT → FK |
| 5 | `20260017_trigger_inventario_colaboradora.sql` | Extender actualizar_inventario() + nuevo trigger validar_stock_colaboradora() |
| 6 | `20260018_rpc_cerrar_visita.sql` | Función cerrar_visita() |
| 7 | `20260019_rls_movimientos.sql` | RLS para INSERT en movimientos_inventario (admin y colaboradora propia) |

---

## Flujo campo — `/campo/visita/[id]`

### Máquina de estados local

```ts
type EtapaVisita = 'conteo' | 'cobro' | 'reposicion' | 'fotos' | 'confirmar_cierre'
```

Cuando `visita.estado === 'en_ejecucion'`, la etapa inicial depende de si hay `detalle_visita` guardado:
- Sin detalle guardado → `'conteo'`
- Con detalle guardado → `'cobro'` (Sprint 3 guardaba y redirigía, Sprint 4 avanza a cobro)

El botón "← Atrás" en el header retrocede la etapa. El header muestra "Paso X de 4" y dots.

### Cambio en `VisitaConteoView`

- Eliminar `router.push('/campo/ruta-del-dia')` del `onSuccess`
- Recibir prop `onConteoGuardado: () => void` y llamarla en `onSuccess`
- La página pasa `() => setEtapa('cobro')` como callback

### Componentes nuevos

**`VisitaCobroView`**
- Muestra `monto_calculado` (read-only, destacado en verde)
- Input numérico `monto_cobrado` (pre-relleno con `monto_calculado`)
- Select `forma_pago_id` con datos de `useFormasPago()` (solo activas)
- Si `monto_cobrado !== monto_calculado`: textarea `notas` visible y obligatoria
- Botón "Continuar → Reposición" — avanza etapa local (no persiste, persiste todo al cerrar)

**`VisitaReposicionView`**
- Tabla: Producto | Inv. anterior | Inv. actual | Tu stock | Sugerido | A reponer (input)
- `sugerido = min(surtido_estandar.cantidad_objetivo - inv_actual, inventario_colaboradora.cantidad_actual)`
- Pre-rellena input con cantidad sugerida, ajustable
- Validación: `unidades_repuestas <= inventario_colaboradora.cantidad_actual` por producto (error inline)
- Botón "Continuar → Fotos"

**`VisitaFotosView`**
- Texto: "Toma una foto de cómo quedó la vitrina"
- `<input type="file" accept="image/*" capture="environment">` (activa cámara en móvil)
- Thumbnails de fotos agregadas con botón eliminar
- Fotos se suben a Supabase Storage en `/visitas/{visita_id}/{timestamp}.jpg`
- Cada foto insertada en `fotos_visita (visita_id, url, tipo='despues')`
- Botón "Continuar → Confirmar" y botón secundario "Saltar fotos"

**`VisitaConfirmarView`**
- Resumen: monto cobrado, forma de pago, nota (si discrepancia), productos repuestos, fotos
- Botón "Cerrar visita" con spinner → llama `cerrarVisita.mutate(...)`
- `cerrarVisita` llama `supabase.rpc('cerrar_visita', { p_visita_id, p_cobro, p_reposiciones })`
- En éxito: `router.push('/campo/ruta-del-dia')` + toast "Visita completada ✓"
- En error: toast con mensaje de error (ej. "Stock insuficiente: Audífonos A1")

---

## Flujos admin nuevos

### `/admin/formas-pago`

- Tabla: Nombre | Estado (badge activo/inactivo) | Acciones (editar, toggle activo)
- `FormasPagoSheet`: campos nombre + toggle activo
- Solo admin puede crear/editar/desactivar
- Entrada en sidebar bajo sección "Configuración"
- Hook `useFormasPago`: list (con filtro activas para campo), create, update

### `/admin/inventario` — Tab "Colaboradoras"

- La página existente pasa a tener tabs: "Central" (contenido actual) y "Colaboradoras"
- Tabla: Colaboradora | Producto | Stock actual | Estado (OK / Bajo / Vacío)
  - Bajo = cantidad_actual > 0 pero < 30% del promedio del surtido estándar de su ruta
  - Vacío = cantidad_actual = 0
- Toolbar: búsqueda por colaboradora/producto + botón "Transferir al campo"
- `TransferenciaSheet`:
  - Select de colaboradora (carga `useColaboradoras`)
  - Filas dinámicas: select producto + input cantidad + stock central disponible
  - Botón "+" para agregar fila; botón "×" para eliminar fila
  - Validación por fila: `cantidad > 0` y `cantidad <= inventario_central.cantidad_actual`
  - Total de unidades a transferir (suma live)
  - Al confirmar: inserta N registros en `movimientos_inventario` (tipo `'carga_colaboradora'`) → trigger actualiza `inventario_central` y `inventario_colaboradora`
- Hook `useInventarioColaboradora`: list (por colaboradora, paginado), mutación `transferir(colaboradora_id, productos[])`

### `/admin/visitas` — extensión

- `VisitasTable` agrega columnas: "Cobrado" (monto) y badge "Discrepancia" (cuando `cobros.estado = 'discrepancia'`)
- `useVisitas` incluye join a `cobros (monto, estado, forma_pago_id, formas_pago(nombre))`

---

## Hooks

### Nuevos

| Hook | Archivo | Operaciones |
|------|---------|------------|
| `useFormasPago` | `lib/hooks/useFormasPago.ts` | list, create, update (admin) |
| `useInventarioColaboradora` | `lib/hooks/useInventarioColaboradora.ts` | list, mutación `transferir` |

### Modificados

| Hook | Cambio |
|------|--------|
| `useVisita` | Agregar query paralela: `inventario_colaboradora` filtrada por `colaboradora_id = auth.uid()` (retorna `Map<producto_id, cantidad_actual>`). El hook ya incluye `surtido_estandar` y `inventario_vitrina` de Sprint 3 — ambos necesarios para calcular `sugerido = min(cantidad_objetivo - inv_actual, stock_colaboradora)`. Agregar mutación `cerrarVisita(cobro, reposiciones)` que llama `supabase.rpc('cerrar_visita', {...})`. |
| `useVisitas` | Join a `cobros` para monto cobrado y estado discrepancia. |

---

## Archivos nuevos

```
erp-vitrinas/
  components/campo/
    VisitaCobroView.tsx
    VisitaReposicionView.tsx
    VisitaFotosView.tsx
    VisitaConfirmarView.tsx
  components/admin/
    FormasPagoSheet.tsx
    TransferenciaSheet.tsx
    InventarioColaboradorasTab.tsx
  lib/hooks/
    useFormasPago.ts
    useInventarioColaboradora.ts
  supabase/migrations/
    20260013_formas_pago.sql
    20260014_inventario_colaboradora.sql
    20260015_movimientos_extend.sql
    20260016_cobros_forma_pago_fk.sql
    20260017_trigger_inventario_colaboradora.sql
    20260018_rpc_cerrar_visita.sql
    20260019_rls_movimientos.sql
  tests/
    sprint4.spec.ts
```

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `app/(campo)/campo/visita/[id]/page.tsx` | Agregar estado local `etapa`, renderizar los 4 nuevos componentes |
| `components/campo/VisitaConteoView.tsx` | Reemplazar `router.push` por prop `onConteoGuardado()` |
| `app/(admin)/admin/inventario/page.tsx` | Agregar tabs Central / Colaboradoras |
| `app/(admin)/admin/formas-pago/page.tsx` | **Nuevo** |
| `components/admin/AppSidebar.tsx` | Agregar sección "Configuración" con "Formas de pago" |
| `components/admin/VisitasTable.tsx` | Agregar columnas cobrado + discrepancia |
| `lib/hooks/useVisita.ts` | Incluir inventario_colaboradora + mutación cerrarVisita |
| `lib/hooks/useVisitas.ts` | Join a cobros |
| `lib/supabase/database.types.ts` | Regenerar tras migraciones |

---

## Reglas de negocio

1. No se puede cerrar una visita sin registrar monto cobrado y forma de pago.
2. Si `monto_cobrado ≠ monto_calculado`, la nota es obligatoria (validación cliente y en RPC).
3. `unidades_repuestas` no puede exceder `inventario_colaboradora.cantidad_actual` por producto.
4. Una colaboradora no puede reponer si su inventario está vacío para ese producto (puede reponer 0).
5. Las fotos son opcionales — se puede cerrar la visita sin fotos.
6. El RPC `cerrar_visita` solo puede ser llamado por la colaboradora asignada o admin (SECURITY DEFINER con verificación interna de `auth.uid()`).
7. Las fotos se suben a Storage y se insertan en `fotos_visita` _antes_ de llamar al RPC. Si el RPC falla después de subir fotos, las fotos quedan en Storage sin visita cerrada — comportamiento aceptado para Sprint 4 (la visita sigue `en_ejecucion` y el usuario puede reintentar; las fotos ya subidas se conservan). Limpieza automática de fotos huérfanas queda como mejora futura.
8. `marcarNoRealizada` está implementado en `useVisita` (Sprint 3). No requiere cambios en Sprint 4.
9. `inventario_colaboradora` solo se escribe vía trigger (SECURITY DEFINER). RLS incluye política explícita que bloquea INSERT/UPDATE/DELETE directo para rol `colaboradora`.
7. `marcarNoRealizada` (S4-07) ya está implementado en Sprint 3 — se verifica en tests.

---

## Tests e2e — `tests/sprint4.spec.ts`

1. Admin crea forma de pago "Depósito bancario" → aparece en select de cobro campo.
2. Admin desactiva forma de pago → desaparece del select campo.
3. Admin transfiere inventario a colaboradora (3 productos) → verificar en UI que stock central de cada producto baja exactamente en la cantidad transferida y stock colaboradora sube en la misma cantidad.
4. Colaboradora: flujo completo sin discrepancia — conteo → cobro (mismo monto) → reposición → saltar fotos → cierre → visita `completada` en `/campo/ruta-del-dia`.
5. Colaboradora: cobro con monto distinto sin nota → error de validación; con nota → discrepancia guardada.
6. Colaboradora: intenta reponer más del stock disponible → error inline por producto.
7. Colaboradora: sube foto → thumbnail visible → cierre exitoso.
8. Admin ve badge "Discrepancia" en `/admin/visitas` para la visita del caso 5.
9. `marcarNoRealizada` (`useVisita.marcarNoRealizada`): visita en estado `planificada` con motivo → estado `no_realizada`; sin motivo → error de validación (verificar regresión Sprint 3).
