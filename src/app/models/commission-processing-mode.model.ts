/**
 * Origen del flujo de comisiones en Commission Cuts.
 *
 * - **GROUPED:** botones a nivel tarjeta asesora (desglose / factura / pago del corte).
 *   No se recalcula corte por fechas ni se limpia `deferredToCutDate` por fechas “retro”.
 * - **INDIVIDUAL:** correcciones históricas / Path 2 “Procesar seleccionadas” (fechas pueden reasignar diferido).
 */
export type CommissionProcessingMode = 'GROUPED' | 'INDIVIDUAL';
