# ADPREC - Ecossistema Digital

## Current State
- All 7 modules live: Membros, Calendário, Dízimos/Ofertas, Cantina, Projetos, Escalas, Oração
- NotificationBanners: shows birthday notifications (today) for all users, 48h advance warning for admins only, debt/tithe alerts for admins
- Escalas: fixed MINISTERIOS list [Louvor, Som, Mídia, Recepção, Ensino, Infantil] — no admin customization
- MeuPerfil: shows birthday countdown for the logged-in user
- Backend Escala type stores `ministerio: Text` as free text (no validation of allowed options)

## Requested Changes (Diff)

### Add
- **Birthday notifications for all members**: All members (not just admins) receive in-app notifications when it's any church member's birthday. Current behavior already shows this, but needs to be confirmed working for non-admins too.
- **Birthday notification in MeuPerfil**: Already exists (birthday countdown card). Keep as-is.
- **Admin 48h advance birthday notification**: Already exists. Keep as-is.
- **Escalas ministry options**: Replace fixed list with extended default options:
  - Oportunidade
  - Oportunidade Ofertório
  - Oportunidade Louvor
  - Oportunidade Oração
  - Início do Culto - Oração e Salmos
  - Oportunidade Pregação
  - Louvor
  - Som
  - Mídia
  - Recepção
  - Ensino
  - Infantil
- **Admin manage schedule options**: Add a "Gerenciar Opções" button in Escalas page (admin only) that opens a dialog to add or remove ministry options. The list is stored in `localStorage` so it persists per browser session (no backend change needed since it's a UI configuration).

### Modify
- **NotificationBanners**: Ensure birthday notifications (today) show for ALL authenticated members, not just admins. Currently the code already does this — confirm the logic is correct.
- **Escalas.tsx**: Replace `MINISTERIOS` constant with an extended default list + localStorage persistence + admin management UI.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `Escalas.tsx`:
   - Replace MINISTERIOS with extended default list (12 options)
   - Load/save custom list from localStorage key `adprec_ministerios`
   - Add "Gerenciar Opções" button (admin only) that opens a dialog
   - Dialog: shows current options with delete (X) button per item, plus an "Adicionar" input field
2. Verify `NotificationBanners.tsx`:
   - Birthday today notifications already fire for all authenticated users (not gated by isAdmin)
   - No change needed, logic is already correct
3. Frontend validation + deploy
