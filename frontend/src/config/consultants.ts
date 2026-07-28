// ANEC report item #13 — consultant contacts for regions NOT served by the
// Ipatinga / Uberlândia units ("Outra Região"). This is the single place to
// edit: David just fills in the two placeholder strings below (and can add
// per-agency overrides if a served unit ever wants its own consultant shown).

export interface ConsultantContact {
  name: string;
  /** Digits only, with country code — e.g. "5531999990000". */
  whatsapp: string;
  email: string;
}

// Out-of-region consultant. Set by ANEC (2026-07-18): for now the head agency
// herself handles these leads via WhatsApp. Email left blank → the card shows
// only WhatsApp. (Pending: she may add Seg/Qua 17:00 + an "urgência" option.)
export const OUTRA_REGIAO_CONSULTANT: ConsultantContact = {
  name: "Consultora ANEC",
  whatsapp: "5533999941712", // (33) 99994-1712
  email: "",
};

// Optional: pin a specific consultant for a given served agency (keyed by agency
// UUID). Empty by default — out-of-region falls back to OUTRA_REGIAO_CONSULTANT.
export const CONSULTANTS_BY_AGENCY: Record<string, ConsultantContact> = {};

export function getConsultantForRegion(agencyId?: string | null): ConsultantContact {
  if (agencyId && CONSULTANTS_BY_AGENCY[agencyId]) return CONSULTANTS_BY_AGENCY[agencyId];
  return OUTRA_REGIAO_CONSULTANT;
}

export function buildWhatsAppLink(whatsapp: string, msg?: string): string {
  const digits = (whatsapp || "").replace(/\D/g, "");
  return `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}
