# M1 · Usuarios y Acceso

Backend de identidad, vinculación, autorización y póliza médica de los patinadores. Usa las tablas y vistas ya definidas en `db/schema.sql`.

## Historias implementadas

| Historia | Alcance | Tablas / vistas |
| --- | --- | --- |
| HU-M1-02/03/04/05/06/07/08 | Registro, sesión, cuentas y roles | `usuario`, `sesion`, `rol`, `rol_permiso` |
| HU-M1-09 | Autorización del acudiente para menores | `autorizacion_acudiente`, `v_perfil_patinador` |
| HU-M1-10 | Registro y consulta de la póliza médica (Acudiente del menor o Administrador) | `poliza`, `v_perfil_patinador`, `auditoria` |
| HU-M1-11 | Vinculación de acudientes y patinadores | `acudiente_patinador` |
| HU-M1-12 | Activación de profesores en primer ingreso | `usuario`, `sesion` |

## HU-M1-10 · Gestión de póliza del patinador

### Endpoints

Base: `/m1/polizas`. Todas las rutas exigen sesión válida (`AutenticacionGuard`) y aplican privacidad M1: el Administrador ve a todos; el Acudiente solo a los patinadores vinculados a su cuenta. Un tercero recibe `403`.

| Método | Ruta | Uso |
| --- | --- | --- |
| `GET` | `/m1/polizas/:patinadorId` | Póliza actual, historial, `puedeRegistrar` y datos del perfil (`tienePolizaVigente`, `estado`) |
| `POST` | `/m1/polizas/:patinadorId` | Registra una póliza nueva (multipart; conserva el historial) |
| `GET` | `/m1/polizas/:patinadorId/archivo/:polizaId` | Descarga autenticada del adjunto privado |

`POST` envía `multipart/form-data` con los campos `aseguradora`, `numeroPoliza`, `vigenteDesde`, `vigenteHasta` (`AAAA-MM-DD`) y `archivo`. No se fija `Content-Type` a mano: el navegador agrega el boundary.

### Criterios de aceptación

- **CA-01:** el adjunto se guarda con nombre aleatorio fuera del directorio público; `poliza.archivo_url` guarda solo la clave privada. Se envía una copia del archivo original, sin nombre de ruta.
- **CA-02:** se validan fechas reales del calendario y que `vigenteHasta >= vigenteDesde` (tanto en el navegador como en el backend; la BD también tiene un `CHECK`).
- **CA-03:** el estado (`VIGENTE`, `VENCIDA`, `PENDIENTE`) se calcula al consultar con `hoyEnClub()` (`America/Bogota`). No hay job ni columna de estado.
- **CA-04:** `v_perfil_patinador` solo considera vigente una póliza `APROBADA` dentro de la vigencia. Sin ella, el perfil del menor sigue `BLOQUEADO` y M4-07 rechaza la inscripción.
- **CA-05:** se aceptan PDF, JPG y PNG de hasta 5 MB. Se valida el MIME declarado y la firma de los primeros bytes. El motivo se devuelve en español tanto al adjuntar (frontend) como en la frontera del API (backend).

### Decisiones y supuestos

- Solo se registran pólizas de **patinadores menores activos y con acudiente**. Los mayores no requieren póliza.
- «Reemplazar póliza» inserta una fila nueva: no hay borrado físico y el historial queda visible en la Card.
- No hay flujo de revisión del Fisioterapeuta con RF propio (REQUIREMENTS §7.4). La póliza registrada queda `APROBADA` para que M4-07 pueda validarla; los campos `revisada_por`, `revisada_en` y `motivo_rechazo` quedan listos si se confirma el flujo.
- Tipos y tamaño máximo del adjunto son un supuesto documentado (el HU los dejaba `[Por definir]`): PDF/JPG/PNG, 5 MB.
- Los archivos se guardan en `POLIZAS_DIR` o, por defecto, en `uploads/polizas` (excluido de git con `.gitignore`). Se sirven por la ruta autenticada, nunca como estáticos.
- Cada registro emite una entrada de `auditoria` (`REGISTRAR_POLIZA`). Si falla la transacción, se elimina el archivo recién guardado.

### Pruebas

```bash
cd code/backend
pnpm test
```

Cubren cálculo de vigencia, validación de fechas y archivos, control de acceso, registro con auditoría, limpieza ante duplicados y descarga segura.
