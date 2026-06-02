/**
 * ═══════════════════════════════════════════════════════════════
 *  /play/rsc — Redirects to /games/rsc/
 *
 *  The game page now lives at /games/rsc/ (standalone HTML with
 *  the shared arcade shell), matching all other game pages.
 * ═══════════════════════════════════════════════════════════════
 */

import { redirect } from "next/navigation";

export default function RscPlayPage() {
  redirect("/games/rsc/");
}
