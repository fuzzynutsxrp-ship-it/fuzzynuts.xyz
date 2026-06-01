/**
 * Desktop bootstrap — minimal. The Tauri window loads the
 * @fuzzynuts/web-arcade static export directly; this file
 * is only here for future deeplink + auto-update wiring.
 */

import { invoke } from "@tauri-apps/api/core";

window.addEventListener("DOMContentLoaded", () => {
  void invoke("ready").catch(() => {
    /* command not registered yet — safe to ignore in scaffold */
  });
});
