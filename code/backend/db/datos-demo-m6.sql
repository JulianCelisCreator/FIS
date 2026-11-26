-- =============================================================================
-- Datos de demostración de M6 (Grupo 06): personal, proveedores, inventario,
-- ventas con devoluciones y préstamos de implementos.
--
-- Requiere datos-demo.sql (usuarios, patinadores y acudientes de M5). Se cargan
-- a mano, en orden, sobre una base recién creada:
--
--   docker exec -i patinaje-db psql -U patinaje -d patinaje < db/datos-demo.sql
--   docker exec -i patinaje-db psql -U patinaje -d patinaje < db/datos-demo-m6.sql
--
-- Las fechas son relativas a hoy. Cada venta y préstamo sigue los mismos pasos
-- que el backend (cobro/pago/comprobante en M5, stock y Kardex), así que los
-- reportes de M6-04 tienen ingresos, una devolución parcial, una venta anulada
-- por devolución total, préstamos activos, vencidos, devueltos y perdidos.
-- Ingresa como Andrea López (Administradora) o Martha Gómez (Contadora) con la
-- contraseña Velora2026.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  hoy date := current_date;

  u_andrea bigint; u_martha bigint; u_carolina bigint; u_luis bigint; u_juan bigint;
  p_sofia bigint; p_mateo bigint; p_samuel bigint; p_juan bigint;

  prov_conf bigint; prov_impl bigint;
  cam_m bigint; cam_s bigint; cha_s bigint; pan_m bigint; uni_m bigint;
  cas_m bigint; cas_l bigint; rod bigint; cod bigint;

  v_id bigint; c_id bigint; pg_id bigint; d_id bigint; pr_id bigint;
BEGIN
  SELECT id INTO STRICT u_andrea   FROM usuario WHERE correo = 'andrea.lopez@escuela.com';
  SELECT id INTO STRICT u_martha   FROM usuario WHERE correo = 'martha.gomez@escuela.com';
  SELECT id INTO STRICT u_carolina FROM usuario WHERE correo = 'carolina.torres@example.com';
  SELECT id INTO STRICT u_luis     FROM usuario WHERE correo = 'luis.herrera@example.com';
  SELECT id INTO STRICT u_juan     FROM usuario WHERE correo = 'juan.gonzalez@example.com';
  SELECT id INTO STRICT p_sofia  FROM patinador WHERE numero_documento = '1023456789';
  SELECT id INTO STRICT p_mateo  FROM patinador WHERE numero_documento = '1034567890';
  SELECT id INTO STRICT p_samuel FROM patinador WHERE numero_documento = '1045678901';
  SELECT id INTO STRICT p_juan   FROM patinador WHERE numero_documento = '1012345678';

  -- Personal (HU-6.2) y rol Contador (HU-6.3) -------------------------------
  INSERT INTO personal (usuario_id, tipo_documento, numero_documento, nombres, apellidos,
                        correo_institucional, telefono, cargo, fecha_ingreso)
  VALUES
    (u_andrea, 'CC', '52111222', 'Andrea', 'López', 'andrea.lopez@escuela.com', '3105550101', 'ADMINISTRATIVO', hoy - 900),
    (u_martha, 'CC', '41333444', 'Martha', 'Gómez', 'martha.gomez@escuela.com', '3115550102', 'CONTADOR', hoy - 400),
    (NULL,     'CC', '1019555666', 'Diana', 'Suárez', 'diana.suarez@escuela.com', '3205550103', 'PROFESOR', hoy - 300);
  INSERT INTO personal (tipo_documento, numero_documento, nombres, apellidos, correo_institucional,
                        telefono, cargo, estado, fecha_ingreso, fecha_retiro)
  VALUES ('CE', 'E-889911', 'Mateo', 'Rincón', 'mateo.rincon@escuela.com', '3005550104',
          'FISIOTERAPEUTA', 'INACTIVO', hoy - 500, hoy - 30);

  -- Proveedores e inventario (HU-6.6) --------------------------------------
  INSERT INTO proveedor (razon_social, nit_documento, correo, telefono)
  VALUES ('Confecciones Velora S.A.S.', '900123456-1', 'ventas@confeccionesvelora.test', '6015550100')
  RETURNING id INTO prov_conf;
  INSERT INTO proveedor (razon_social, nit_documento, correo, telefono)
  VALUES ('Implementos Rueda Ltda.', '901234567-8', 'pedidos@implementosrueda.test', '6015550200')
  RETURNING id INTO prov_impl;
  INSERT INTO proveedor (razon_social, nit_documento, telefono, activo)
  VALUES ('Textiles Antiguos', '800987654-3', '6015550300', false);

  -- Prendas a la venta. UNI-COMP-M queda bajo el mínimo para ver la alerta.
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima)
  VALUES ('CAM-OFI-M', 'CAMISETA', 'M', prov_conf, 38000, 55000, 15, 4) RETURNING id INTO cam_m;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima)
  VALUES ('CAM-OFI-S', 'CAMISETA', 'S', prov_conf, 38000, 55000, 12, 4) RETURNING id INTO cam_s;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima)
  VALUES ('CHA-CLUB-S', 'CHAQUETA', 'S', prov_conf, 90000, 125000, 6, 2) RETURNING id INTO cha_s;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima)
  VALUES ('PAN-CLUB-M', 'PANTALON', 'M', prov_conf, 42000, 65000, 9, 3) RETURNING id INTO pan_m;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima)
  VALUES ('UNI-COMP-M', 'UNIFORME_COMPLETO', 'M', prov_conf, 150000, 210000, 3, 2) RETURNING id INTO uni_m;

  -- Implementos: solo préstamo (precio de venta 0, tarifa sugerida por día).
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima, tarifa_prestamo_dia)
  VALUES ('CAS-PAT-M', 'IMPLEMENTO', 'M', prov_impl, 85000, 0, 6, 2, 3000) RETURNING id INTO cas_m;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima, tarifa_prestamo_dia)
  VALUES ('CAS-PAT-L', 'IMPLEMENTO', 'L', prov_impl, 85000, 0, 4, 2, 3000) RETURNING id INTO cas_l;
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima, tarifa_prestamo_dia)
  VALUES ('ROD-PAT-U', 'IMPLEMENTO', 'UNICA', prov_impl, 42000, 0, 10, 3, 2000) RETURNING id INTO rod;
  -- Mismo tipo y talla que ROD-PAT-U: va con otro proveedor por UNIQUE(tipo, talla, proveedor_id).
  INSERT INTO uniforme (referencia, tipo, talla, proveedor_id, costo, precio_venta, cantidad_disponible, cantidad_minima, tarifa_prestamo_dia)
  VALUES ('COD-PAT-U', 'IMPLEMENTO', 'UNICA', prov_conf, 35000, 0, 8, 2, 1500) RETURNING id INTO cod;

  -- Stock inicial en el Kardex (como hace POST /m6/uniformes).
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, observacion, registrado_por, registrado_en)
  SELECT id, 'ENTRADA', cantidad_disponible, 'Stock inicial', u_andrea, (hoy - 60) + time '09:00'
  FROM uniforme WHERE id IN (cam_m, cam_s, cha_s, pan_m, uni_m, cas_m, cas_l, rod, cod);

  -- Ventas (HU-6.7): cobro PAGADO + pago + comprobante en M5, venta, stock y Kardex.
  -- V1 · hace 40 días · Carolina compra para Sofía · efectivo.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
  VALUES (p_sofia, 'VENTA_UNIFORME', 'Venta de uniformes: CAM-OFI-S (S) x2, PAN-CLUB-M (M) x1', 175000, hoy - 40, 'PAGADO', u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, registrado_por)
  VALUES (p_sofia, 'VENTA_UNIFORME', 175000, hoy - 40, 'EFECTIVO', u_andrea) RETURNING id INTO pg_id;
  INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES (pg_id, c_id, 175000);
  INSERT INTO comprobante (pago_id) VALUES (pg_id);
  INSERT INTO venta_uniforme (patinador_id, comprador_tipo, comprador_id, fecha, total, medio_pago, cobro_id, pago_id, registrado_por)
  VALUES (p_sofia, 'ACUDIENTE', u_carolina, hoy - 40, 175000, 'EFECTIVO', c_id, pg_id, u_andrea) RETURNING id INTO v_id;
  INSERT INTO venta_detalle (venta_id, uniforme_id, referencia, talla, cantidad, valor_unitario) VALUES
    (v_id, cam_s, 'CAM-OFI-S', 'S', 2, 55000),
    (v_id, pan_m, 'PAN-CLUB-M', 'M', 1, 65000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 2 WHERE id = cam_s;
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = pan_m;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en) VALUES
    (cam_s, 'VENTA', -2, v_id, 'Venta #' || v_id, u_andrea, (hoy - 40) + time '10:15'),
    (pan_m, 'VENTA', -1, v_id, 'Venta #' || v_id, u_andrea, (hoy - 40) + time '10:15');

  -- V2 · hace 18 días · Samuel (sin cuenta propia) compra una chaqueta · transferencia.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
  VALUES (p_samuel, 'VENTA_UNIFORME', 'Venta de uniformes: CHA-CLUB-S (S) x1', 125000, hoy - 18, 'PAGADO', u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, referencia, registrado_por)
  VALUES (p_samuel, 'VENTA_UNIFORME', 125000, hoy - 18, 'TRANSFERENCIA', 'TRX-90112', u_andrea) RETURNING id INTO pg_id;
  INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES (pg_id, c_id, 125000);
  INSERT INTO comprobante (pago_id) VALUES (pg_id);
  INSERT INTO venta_uniforme (patinador_id, comprador_tipo, comprador_id, fecha, total, medio_pago, cobro_id, pago_id, registrado_por)
  VALUES (p_samuel, 'PATINADOR', NULL, hoy - 18, 125000, 'TRANSFERENCIA', c_id, pg_id, u_andrea) RETURNING id INTO v_id;
  INSERT INTO venta_detalle (venta_id, uniforme_id, referencia, talla, cantidad, valor_unitario)
  VALUES (v_id, cha_s, 'CHA-CLUB-S', 'S', 1, 125000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = cha_s;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en)
  VALUES (cha_s, 'VENTA', -1, v_id, 'Venta #' || v_id, u_andrea, (hoy - 18) + time '16:40');

  -- V3 · hace 5 días · Juan Pablo (cuenta propia) · consignación.
  -- Hace 3 días devuelve la camiseta: devolución PARCIAL, el pago sigue vigente
  -- y el reembolso (55.000) se resta de los ingresos en el reporte.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
  VALUES (p_juan, 'VENTA_UNIFORME', 'Venta de uniformes: UNI-COMP-M (M) x1, CAM-OFI-M (M) x1', 265000, hoy - 5, 'PAGADO', u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, referencia, registrado_por)
  VALUES (p_juan, 'VENTA_UNIFORME', 265000, hoy - 5, 'CONSIGNACION', 'CON-4471', u_andrea) RETURNING id INTO pg_id;
  INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES (pg_id, c_id, 265000);
  INSERT INTO comprobante (pago_id) VALUES (pg_id);
  INSERT INTO venta_uniforme (patinador_id, comprador_tipo, comprador_id, fecha, total, medio_pago, cobro_id, pago_id, registrado_por)
  VALUES (p_juan, 'PATINADOR', u_juan, hoy - 5, 265000, 'CONSIGNACION', c_id, pg_id, u_andrea) RETURNING id INTO v_id;
  INSERT INTO venta_detalle (venta_id, uniforme_id, referencia, talla, cantidad, valor_unitario) VALUES
    (v_id, uni_m, 'UNI-COMP-M', 'M', 1, 210000),
    (v_id, cam_m, 'CAM-OFI-M', 'M', 1, 55000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id IN (uni_m, cam_m);
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en) VALUES
    (uni_m, 'VENTA', -1, v_id, 'Venta #' || v_id, u_andrea, (hoy - 5) + time '11:00'),
    (cam_m, 'VENTA', -1, v_id, 'Venta #' || v_id, u_andrea, (hoy - 5) + time '11:00');

  INSERT INTO devolucion_venta (venta_id, fecha, motivo, valor_devuelto, medio_reembolso, anula_pago, registrado_por)
  VALUES (v_id, hoy - 3, 'Talla equivocada', 55000, 'EFECTIVO', false, u_andrea) RETURNING id INTO d_id;
  INSERT INTO devolucion_venta_detalle (devolucion_id, uniforme_id, cantidad, valor_unitario)
  VALUES (d_id, cam_m, 1, 55000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible + 1 WHERE id = cam_m;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en)
  VALUES (cam_m, 'DEVOLUCION', 1, v_id, 'Devolución #' || d_id || ' de la venta #' || v_id || ': Talla equivocada',
          u_andrea, (hoy - 3) + time '09:30');

  -- V4 · ayer · Carolina compra para Mateo y la devuelve completa el mismo día:
  -- devolución TOTAL, se anulan pago, comprobante y cobro (no cuenta en ingresos).
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
  VALUES (p_mateo, 'VENTA_UNIFORME', 'Venta de uniformes: CAM-OFI-S (S) x1', 55000, hoy - 1, 'PAGADO', u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, registrado_por)
  VALUES (p_mateo, 'VENTA_UNIFORME', 55000, hoy - 1, 'EFECTIVO', u_andrea) RETURNING id INTO pg_id;
  INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES (pg_id, c_id, 55000);
  INSERT INTO comprobante (pago_id) VALUES (pg_id);
  INSERT INTO venta_uniforme (patinador_id, comprador_tipo, comprador_id, fecha, total, medio_pago, cobro_id, pago_id, registrado_por)
  VALUES (p_mateo, 'ACUDIENTE', u_carolina, hoy - 1, 55000, 'EFECTIVO', c_id, pg_id, u_andrea) RETURNING id INTO v_id;
  INSERT INTO venta_detalle (venta_id, uniforme_id, referencia, talla, cantidad, valor_unitario)
  VALUES (v_id, cam_s, 'CAM-OFI-S', 'S', 1, 55000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = cam_s;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en)
  VALUES (cam_s, 'VENTA', -1, v_id, 'Venta #' || v_id, u_andrea, (hoy - 1) + time '08:45');

  INSERT INTO devolucion_venta (venta_id, fecha, motivo, valor_devuelto, medio_reembolso, anula_pago, registrado_por)
  VALUES (v_id, hoy - 1, 'Ya tenía una camiseta de su hermana', 55000, 'EFECTIVO', true, u_andrea) RETURNING id INTO d_id;
  INSERT INTO devolucion_venta_detalle (devolucion_id, uniforme_id, cantidad, valor_unitario)
  VALUES (d_id, cam_s, 1, 55000);
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible + 1 WHERE id = cam_s;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, venta_id, observacion, registrado_por, registrado_en)
  VALUES (cam_s, 'DEVOLUCION', 1, v_id, 'Devolución #' || d_id || ' de la venta #' || v_id || ': Ya tenía una camiseta de su hermana',
          u_andrea, (hoy - 1) + time '17:20');
  UPDATE pago SET estado = 'ANULADO', anulado_por = u_andrea, anulado_en = now(),
                  motivo_anulacion = 'Devolución total de la venta #' || v_id
  WHERE id = pg_id;
  UPDATE comprobante SET estado = 'ANULADO', anulado_en = now() WHERE pago_id = pg_id;
  UPDATE cobro SET estado = 'ANULADO', anulado_en = now(), motivo_anulacion = 'Devolución total de la venta #' || v_id
  WHERE id = c_id;

  -- Préstamos de implementos (HU-6.8): cobro PENDIENTE = tarifa × cantidad × días.
  -- P1 · VENCIDO: Samuel, casco M, prestado hace 10 días, debía volver hace 3.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, creado_por)
  VALUES (p_samuel, 'PRESTAMO_IMPLEMENTO', 'Préstamo CAS-PAT-M · 1 unidad · 7 días', 21000, hoy - 3, u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO prestamo_uniforme (uniforme_id, patinador_id, responsable_id, cantidad, fecha_prestamo,
                                 fecha_devolucion_prevista, estado_entrega, tarifa_dia, dias_cobrados,
                                 valor_cobro, cobro_id, registrado_por)
  VALUES (cas_m, p_samuel, u_luis, 1, hoy - 10, hoy - 3, 'BUEN_ESTADO', 3000, 7, 21000, c_id, u_andrea)
  RETURNING id INTO pr_id;
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = cas_m;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por, registrado_en)
  VALUES (cas_m, 'PRESTAMO', -1, pr_id, 'Préstamo registrado', u_andrea, (hoy - 10) + time '15:00');

  -- P2 · ACTIVO: Sofía, rodilleras, prestadas hace 2 días por una semana.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, creado_por)
  VALUES (p_sofia, 'PRESTAMO_IMPLEMENTO', 'Préstamo ROD-PAT-U · 1 unidad · 7 días', 14000, hoy + 5, u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO prestamo_uniforme (uniforme_id, patinador_id, responsable_id, cantidad, fecha_prestamo,
                                 fecha_devolucion_prevista, estado_entrega, tarifa_dia, dias_cobrados,
                                 valor_cobro, cobro_id, registrado_por)
  VALUES (rod, p_sofia, u_carolina, 1, hoy - 2, hoy + 5, 'NUEVO', 2000, 7, 14000, c_id, u_andrea)
  RETURNING id INTO pr_id;
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = rod;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por, registrado_en)
  VALUES (rod, 'PRESTAMO', -1, pr_id, 'Préstamo registrado', u_andrea, (hoy - 2) + time '15:30');

  -- P3 · DEVUELTO: Juan Pablo, 2 coderas por 5 días; cobro pagado al devolver.
  INSERT INTO cobro (patinador_id, concepto, descripcion, valor, fecha_limite, estado, creado_por)
  VALUES (p_juan, 'PRESTAMO_IMPLEMENTO', 'Préstamo COD-PAT-U · 2 unidades · 5 días', 15000, hoy - 15, 'PAGADO', u_andrea)
  RETURNING id INTO c_id;
  INSERT INTO prestamo_uniforme (uniforme_id, patinador_id, responsable_id, cantidad, fecha_prestamo,
                                 fecha_devolucion_prevista, estado_entrega, tarifa_dia, dias_cobrados,
                                 valor_cobro, cobro_id, estado, fecha_recepcion, estado_recepcion, registrado_por)
  VALUES (cod, p_juan, u_juan, 2, hoy - 20, hoy - 15, 'BUEN_ESTADO', 1500, 5, 15000, c_id,
          'DEVUELTO', hoy - 15, 'BUEN_ESTADO', u_andrea)
  RETURNING id INTO pr_id;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por, registrado_en) VALUES
    (cod, 'PRESTAMO', -2, pr_id, 'Préstamo registrado', u_andrea, (hoy - 20) + time '16:00'),
    (cod, 'DEVOLUCION', 2, pr_id, 'Devolución registrada', u_andrea, (hoy - 15) + time '17:00');
  INSERT INTO pago (patinador_id, tipo, monto, fecha_pago, medio_pago, registrado_por)
  VALUES (p_juan, 'COBRO', 15000, hoy - 15, 'EFECTIVO', u_martha) RETURNING id INTO pg_id;
  INSERT INTO pago_cobro (pago_id, cobro_id, monto_aplicado) VALUES (pg_id, c_id, 15000);
  INSERT INTO comprobante (pago_id) VALUES (pg_id);

  -- P4 · PÉRDIDA/DAÑO: Mateo, casco L sin cobro (tarifa 0); no regresa al stock.
  INSERT INTO prestamo_uniforme (uniforme_id, patinador_id, responsable_id, cantidad, fecha_prestamo,
                                 fecha_devolucion_prevista, estado_entrega, tarifa_dia, dias_cobrados,
                                 valor_cobro, estado, fecha_recepcion, estado_recepcion, observacion, registrado_por)
  VALUES (cas_l, p_mateo, u_carolina, 1, hoy - 30, hoy - 25, 'NUEVO', 0, 5, 0,
          'PERDIDA_DANO', hoy - 24, 'DANADO', 'El casco llegó con la carcasa partida tras una caída en entrenamiento.', u_andrea)
  RETURNING id INTO pr_id;
  UPDATE uniforme SET cantidad_disponible = cantidad_disponible - 1 WHERE id = cas_l;
  INSERT INTO movimiento_inventario (uniforme_id, tipo, cantidad, prestamo_id, observacion, registrado_por, registrado_en)
  VALUES (cas_l, 'PRESTAMO', -1, pr_id, 'Préstamo registrado', u_andrea, (hoy - 30) + time '15:00');
END;
$$;

COMMIT;
