# Flujo de carga de datos en el sistema

## Punto de entrada central: `loadAfterAuth`

Se dispara en **dos momentos**:
1. **restoreSessionSuccess** (al iniciar app con sesión ya existente)
2. **loginSuccess** (tras login exitoso)

**Ubicación**: `store/auth/auth.effects.ts` → dispara `UtilActions.loadAfterAuth()`

## Lo que carga `loadAfterAuth` (UtilEffects)

| Acción | Datos |
|--------|-------|
| loadUsers | Usuarios |
| loadInvites | Invitaciones |
| loadAdvisors | Asesoras |
| loadContracts | Contratos |
| loadCommissionConfigs | Configs de comisión |
| loadCommissionPolicies | Políticas de comisión |
| loadCommissionPaymentsForCuts | Todas las comisiones activas (`_on`), histórico de cortes |

**Ubicación**: `store/util/util.effects.ts` → `loadAfterAuth$`

Todos estos módulos están registrados en `MyStoreModule` (AppModule), por lo que los effects corren desde el arranque de la app.

## Cargas adicionales por ruta/pantalla

- **commission-cuts**: Resolver + ionViewWillEnter también cargan advisors + commissionPaymentsForCuts
- **contracts**: Al seleccionar contrato, loadCommissionPaymentsByContract (reemplaza el store)
- **contract-commissions**: loadCommissionPayments por tranche o por contrato

## Importante: store de commissionPayments

El store de comisiones se **reemplaza** (`setAll`) en cada carga:
- loadCommissionPaymentsForCuts → todas las comisiones activas (no limitado a 12 meses)
- loadCommissionPaymentsByContract → solo comisiones de un contrato
- loadCommissionPayments (tranche) → solo comisiones de un tranche

Por eso commission-cuts debe **siempre** recargar `loadCommissionPaymentsForCuts` al entrar, para no quedar con datos de un solo contrato.
