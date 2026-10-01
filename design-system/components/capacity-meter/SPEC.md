# CapacityMeter

- **Fila de origen:** components.md · Moléculas
- **Tipo:** B
- **RF:** M3-02

## Anatomía
`<ps-capacity-meter value max label show-percent>` → barra `role="meter"` + texto `ocupados/total` + estado (texto+ícono).

## API
| Elemento | Nombre | Valores | Por defecto | Descripción |
|---|---|---|---|---|
| Atributo | `value`/`max` | enteros | — | `max>0`, `value≥0` |
| Atributo | `show-percent` | bool | off | Agrega % |
| Evento | — | — | — | Solo lectura |

## Estados
Regla entera: `value×100<max×90`→success/Con cupo; `≥90% y <max`→warning; `≥max`→error/Lleno; inválido→«—»+`aria-invalid`.

## Casos de catálogo
0/20 success · 17/20 success · 18/20 warning · 19/20 warning · 20/20 error · 21/20 error llena · 5/0 «—».
