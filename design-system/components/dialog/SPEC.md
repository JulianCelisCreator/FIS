# Dialog / ConfirmWithReason

- **Fila de origen:** components.md · Moléculas
- **Tipo:** B
- **RF:** M5-11, M4-12, M4-18, M6-08

## Anatomía
`<ps-dialog variant heading confirm-label reason-label>` + `data-slot="body/error"`. Sobre `<dialog>` nativo.

## API
Atributos `variant=confirm|reason|form`, `loading`; métodos `show()/close()`; eventos `ps-confirm {reason}`, `ps-cancel`, `close` nativo.

## Estados
Motivo obligatorio con trim; vacío→confirmar `aria-disabled`; loading→`aria-busy`, sin Esc ni fondo; error→slot Alert.

## Accesibilidad
`showModal()`, `aria-labelledby`; foco al motivo, retorno al opener; Esc salvo loading; bottom sheet móvil (confirm/reason), fullscreen (form).
