/**
 * ═══════════════════════════════════════════════════════════════
 *  /play/rsc — RuneScape Classic (Open-RSC) game page
 *
 *  Embeds the TeaVM browser client directly — no wallet gate.
 *  Players can register in-game. Modeled after rsc.vet.
 * ═══════════════════════════════════════════════════════════════
 */

"use client";

/** Web client URL — TeaVM RSC client hosted on the game VPS */
const RSC_CLIENT_BASE = "http://game.fuzzynuts.xyz";

/** RSA parameters for the FuzzyNuts Open-RSC server */
const RSA_EXPONENT = "65537";
const RSA_MODULUS =
  "8289659822450956547091737980685999494469917119448636848399591851485736573017442330778779185880707301889402408746652224912191720358420083485471439352872909";

/** Build the web client URL with server connection params */
const CLIENT_URL = `${RSC_CLIENT_BASE}/#members,game.fuzzynuts.xyz,43494,${RSA_EXPONENT},${RSA_MODULUS},true`;

export default function RscPlayPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Title */}
      <h1 className="font-display text-2xl font-bold text-white text-center">
        RuneScape Classic
      </h1>
      <p className="mt-1 text-center text-xs text-zinc-500">
        Powered by Open-RSC · Play in your browser — no downloads needed
      </p>

      {/* Game Client iframe — matches rsc.vet dimensions */}
      <div className="mt-4 flex justify-center">
        <div className="relative overflow-hidden rounded-lg border border-pink-500/20 bg-black">
          <iframe
            src={CLIENT_URL}
            title="RuneScape Classic — FuzzyNuts"
            width="513"
            height="352"
            className="block border-0"
            allow="autoplay; fullscreen"
          />
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-center text-[11px] text-zinc-600">
        FuzzyNuts is not affiliated with the original RuneScape Classic nor its
        publisher.
      </p>
    </div>
  );
}
