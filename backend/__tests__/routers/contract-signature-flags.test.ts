// Deciding whether a hire is fully signed.
//
// Writing company_signed / candidate_signed fires the DB trigger that moves a
// hire out of pending_signatures — estágio to active (which generates billing),
// CLT to pending_payment. Getting this wrong activates a hire nobody finished
// signing, so these cases are about refusing to infer rather than about
// convenience.
import { describe, it, expect } from "vitest";
import { deriveSignatureFlags } from "../../routers/contract";

const doc = (signers: Array<{ role?: string; signed_at?: string | null }>) => ({ signers });
const SIGNED = "2026-07-30T12:00:00Z";

describe("deriveSignatureFlags", () => {
  it("marks both parties signed once each has signed every document", () => {
    const flags = deriveSignatureFlags([
      doc([
        { role: "company", signed_at: SIGNED },
        { role: "candidate", signed_at: SIGNED },
      ]),
    ]);
    expect(flags).toEqual({ allCompanySigned: true, allCandidateSigned: true, unresolvedDocs: 0 });
  });

  it("does not mark a party signed while one document is outstanding", () => {
    const flags = deriveSignatureFlags([
      doc([
        { role: "company", signed_at: SIGNED },
        { role: "candidate", signed_at: SIGNED },
      ]),
      doc([
        { role: "company", signed_at: null },
        { role: "candidate", signed_at: SIGNED },
      ]),
    ]);
    expect(flags.allCompanySigned).toBe(false);
    expect(flags.allCandidateSigned).toBe(true);
  });

  it("treats a role that is genuinely absent as not required to sign", () => {
    // A document only the candidate signs must not hold the company back.
    const flags = deriveSignatureFlags([doc([{ role: "candidate", signed_at: SIGNED }])]);
    expect(flags.allCompanySigned).toBe(true);
    expect(flags.allCandidateSigned).toBe(true);
  });

  it("refuses to infer anything from a document with unknown roles", () => {
    // THE REGRESSION. Every signer stored as "unknown" and one party has signed.
    // The old logic found no signer with role "company", read that as "not
    // required", and set BOTH flags — activating the hire on one signature.
    const flags = deriveSignatureFlags([
      doc([
        { role: "unknown", signed_at: SIGNED },
        { role: "unknown", signed_at: null },
      ]),
    ]);
    expect(flags.allCompanySigned).toBe(false);
    expect(flags.allCandidateSigned).toBe(false);
    expect(flags.unresolvedDocs).toBe(1);
  });

  it("refuses even when every unknown signer has signed", () => {
    // All parties signed, but we cannot say who they were, so we do not claim
    // that a specific role signed. The repair script resolves the roles first.
    const flags = deriveSignatureFlags([
      doc([
        { role: "unknown", signed_at: SIGNED },
        { role: "unknown", signed_at: SIGNED },
      ]),
    ]);
    expect(flags.allCompanySigned).toBe(false);
    expect(flags.allCandidateSigned).toBe(false);
  });

  it("lets one unresolved document block an otherwise complete hire", () => {
    const flags = deriveSignatureFlags([
      doc([
        { role: "company", signed_at: SIGNED },
        { role: "candidate", signed_at: SIGNED },
      ]),
      doc([{ role: "unknown", signed_at: SIGNED }]),
    ]);
    expect(flags.allCompanySigned).toBe(false);
    expect(flags.allCandidateSigned).toBe(false);
    expect(flags.unresolvedDocs).toBe(1);
  });

  it("treats a missing or blank role as unresolved, not as absent", () => {
    expect(deriveSignatureFlags([doc([{ signed_at: SIGNED }])]).allCompanySigned).toBe(false);
    expect(deriveSignatureFlags([doc([{ role: "", signed_at: SIGNED }])]).allCandidateSigned).toBe(false);
  });

  it("reports both parties signed when there are no documents at all", () => {
    // every() on an empty list is true. Callers only reach this after finding
    // at least one Autentique document, so this documents the edge rather than
    // endorsing it as a way to complete a hire.
    expect(deriveSignatureFlags([])).toEqual({
      allCompanySigned: true,
      allCandidateSigned: true,
      unresolvedDocs: 0,
    });
  });
});
