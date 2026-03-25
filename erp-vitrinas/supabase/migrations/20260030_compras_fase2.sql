-- ============================================================
-- Sprint 7 — Compras
-- Indices + RPC recibir_compra
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_compras_estado
  ON compras(estado);

CREATE INDEX IF NOT EXISTS idx_compras_proveedor
  ON compras(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_compras_fecha
  ON compras(fecha);

CREATE OR REPLACE FUNCTION recibir_compra(
  p_compra_id UUID,
  p_items JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_estado TEXT;
  v_item JSONB;
  v_detalle detalle_compra%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF COALESCE(jsonb_typeof(p_items), 'array') <> 'array' THEN
    RAISE EXCEPTION 'Los items deben enviarse como un arreglo JSON';
  END IF;

  SELECT estado
  INTO v_estado
  FROM compras
  WHERE id = p_compra_id;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Compra no encontrada: %', p_compra_id;
  END IF;

  IF v_estado = 'recibida' THEN
    RETURN;
  END IF;

  IF v_estado NOT IN ('pendiente', 'confirmada') THEN
    RAISE EXCEPTION 'No se puede recibir una compra en estado: %', v_estado;
  END IF;

  FOR v_item IN
    SELECT value
    FROM jsonb_array_elements(p_items)
  LOOP
    SELECT *
    INTO v_detalle
    FROM detalle_compra
    WHERE id = (v_item->>'detalle_compra_id')::UUID
      AND compra_id = p_compra_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linea de compra no encontrada: %', v_item->>'detalle_compra_id';
    END IF;

    UPDATE detalle_compra
    SET
      cantidad_recibida = COALESCE((v_item->>'cantidad_recibida')::INT, 0),
      updated_at = now()
    WHERE id = v_detalle.id;

    IF COALESCE((v_item->>'cantidad_recibida')::INT, 0) > 0 THEN
      INSERT INTO movimientos_inventario (
        producto_id,
        cantidad,
        tipo,
        direccion,
        destino_tipo,
        costo_unitario,
        referencia_tipo,
        referencia_id,
        usuario_id,
        notas
      ) VALUES (
        v_detalle.producto_id,
        (v_item->>'cantidad_recibida')::INT,
        'compra',
        'entrada',
        'central',
        v_detalle.costo_unitario,
        'compra',
        p_compra_id,
        auth.uid(),
        'Recepcion de orden de compra'
      );
    END IF;
  END LOOP;

  UPDATE compras
  SET
    estado = 'recibida',
    total_real = (
      SELECT COALESCE(SUM(dc.cantidad_recibida * COALESCE(dc.costo_unitario, 0)), 0)
      FROM detalle_compra dc
      WHERE dc.compra_id = p_compra_id
    ),
    updated_at = now()
  WHERE id = p_compra_id;
END;
$$;
