-- ============================================================
-- Sprint 7 — Garantias
-- RLS restrictivo + RPCs registrar/resolver
-- ============================================================

ALTER TABLE garantias
  ADD COLUMN IF NOT EXISTS notas_resolucion TEXT;

DROP POLICY IF EXISTS "garantias_select" ON garantias;
CREATE POLICY "garantias_select" ON garantias
  FOR SELECT TO authenticated
  USING (
    get_my_rol() IN ('admin', 'supervisor', 'analista', 'compras')
    OR (
      get_my_rol() = 'colaboradora'
      AND visita_recepcion_id IN (
        SELECT id
        FROM visitas
        WHERE colaboradora_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "garantias_update" ON garantias;
CREATE POLICY "garantias_update" ON garantias
  FOR UPDATE TO authenticated
  USING (get_my_rol() IN ('admin', 'supervisor'))
  WITH CHECK (get_my_rol() IN ('admin', 'supervisor'));

CREATE INDEX IF NOT EXISTS idx_garantias_estado
  ON garantias(estado);

CREATE INDEX IF NOT EXISTS idx_garantias_visita
  ON garantias(visita_recepcion_id);

CREATE INDEX IF NOT EXISTS idx_garantias_pdv
  ON garantias(pdv_id);

CREATE OR REPLACE FUNCTION registrar_garantia(
  p_garantia_id UUID,
  p_visita_recepcion_id UUID,
  p_pdv_id UUID,
  p_producto_id UUID,
  p_cantidad INT,
  p_motivo TEXT,
  p_fecha_venta_aprox DATE DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_id UUID;
  v_vitrina_id UUID;
  v_colaboradora_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF get_my_rol() NOT IN ('admin', 'colaboradora') THEN
    RAISE EXCEPTION 'Sin permisos para registrar garantias';
  END IF;

  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT vitrina_id, colaboradora_id
  INTO v_vitrina_id, v_colaboradora_id
  FROM visitas
  WHERE id = p_visita_recepcion_id;

  IF NOT FOUND OR v_vitrina_id IS NULL THEN
    RAISE EXCEPTION 'Visita no encontrada o sin vitrina: %', p_visita_recepcion_id;
  END IF;

  IF get_my_rol() = 'colaboradora' AND v_colaboradora_id <> auth.uid() THEN
    RAISE EXCEPTION 'No autorizado para registrar garantias en esta visita';
  END IF;

  INSERT INTO garantias (
    id,
    visita_recepcion_id,
    pdv_id,
    producto_id,
    cantidad,
    motivo,
    fecha_venta_aprox,
    created_by
  ) VALUES (
    p_garantia_id,
    p_visita_recepcion_id,
    p_pdv_id,
    p_producto_id,
    p_cantidad,
    NULLIF(btrim(COALESCE(p_motivo, '')), ''),
    p_fecha_venta_aprox,
    auth.uid()
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    RETURN p_garantia_id;
  END IF;

  INSERT INTO movimientos_inventario (
    producto_id,
    cantidad,
    tipo,
    direccion,
    origen_tipo,
    origen_id,
    referencia_tipo,
    referencia_id,
    usuario_id,
    notas
  ) VALUES (
    p_producto_id,
    p_cantidad,
    'devolucion_garantia',
    'salida',
    'vitrina',
    v_vitrina_id,
    'garantia',
    p_garantia_id,
    auth.uid(),
    'Salida por garantia recibida'
  );

  RETURN v_inserted_id;
END;
$$;

CREATE OR REPLACE FUNCTION resolver_garantia(
  p_garantia_id UUID,
  p_resolucion TEXT,
  p_notas TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_garantia garantias%ROWTYPE;
  v_central_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF get_my_rol() NOT IN ('admin', 'supervisor') THEN
    RAISE EXCEPTION 'Sin permisos para resolver garantias';
  END IF;

  IF p_resolucion NOT IN ('cambio', 'baja', 'devolucion_proveedor') THEN
    RAISE EXCEPTION
      'Resolucion invalida: %. Valores validos: cambio, baja, devolucion_proveedor',
      p_resolucion;
  END IF;

  SELECT *
  INTO v_garantia
  FROM garantias
  WHERE id = p_garantia_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Garantia no encontrada: %', p_garantia_id;
  END IF;

  IF v_garantia.estado NOT IN ('abierta', 'en_proceso') THEN
    RAISE EXCEPTION 'La garantia ya se encuentra en estado terminal: %', v_garantia.estado;
  END IF;

  IF p_resolucion = 'cambio' THEN
    SELECT id
    INTO v_central_id
    FROM inventario_central
    WHERE producto_id = v_garantia.producto_id;

    INSERT INTO movimientos_inventario (
      producto_id,
      cantidad,
      tipo,
      direccion,
      origen_tipo,
      origen_id,
      referencia_tipo,
      referencia_id,
      usuario_id,
      notas
    ) VALUES (
      v_garantia.producto_id,
      v_garantia.cantidad,
      'ajuste',
      'entrada',
      'central',
      v_central_id,
      'garantia',
      v_garantia.id,
      auth.uid(),
      'Ingreso a central por garantia resuelta con cambio'
    );
  END IF;

  UPDATE garantias
  SET
    resolucion = p_resolucion,
    notas_resolucion = NULLIF(btrim(COALESCE(p_notas, '')), ''),
    estado = 'resuelta',
    updated_at = now()
  WHERE id = p_garantia_id;
END;
$$;
