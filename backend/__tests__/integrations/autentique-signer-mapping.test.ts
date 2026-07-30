// Pairing Autentique's response back to the roles we sent.
//
// This decides who is recorded as having legally signed a contract, so the
// cases below are the ones that actually occurred in production rather than
// tidy examples. createDocument omits signer emails on purpose (so Autentique
// returns the signing link instead of emailing it), which is why the old
// email-based match could never succeed.
import { describe, it, expect } from "vitest";
import { mapSignersToRoles } from "../../integrations/autentique";

const ours = [
  { email: "empresa@test.com", name: "Tech Solutions LTDA", role: "company" },
  { email: "cand@test.com", name: "Maria Silva", role: "candidate" },
  { email: "mae@test.com", name: "Ana Silva", role: "parent_guardian" },
  { email: "escola@test.com", name: "Instituição Federal", role: "educational_institution" },
];

const api = (name: string, id: string) => ({
  public_id: id,
  name,
  email: null as string | null,
  signUrl: `https://autentique.com.br/${id}`,
});

describe("mapSignersToRoles", () => {
  it("resolves every role when Autentique returns null emails", () => {
    // The exact production shape: emails omitted on the way out, so they come
    // back null. Matching on email produced role "unknown" for all four.
    const mapped = mapSignersToRoles(ours, [
      api("Tech Solutions LTDA", "a"),
      api("Maria Silva", "b"),
      api("Ana Silva", "c"),
      api("Instituição Federal", "d"),
    ]);

    expect(mapped.map((m) => m.role)).toEqual([
      "company",
      "candidate",
      "parent_guardian",
      "educational_institution",
    ]);
    expect(mapped.every((m) => m.role !== "unknown")).toBe(true);
  });

  it("carries our email through, since the API returns none", () => {
    const mapped = mapSignersToRoles(ours, [api("Maria Silva", "b")]);
    expect(mapped[0].email).toBe("cand@test.com");
    expect(mapped[0].autentiqueSignerId).toBe("b");
    expect(mapped[0].signUrl).toBe("https://autentique.com.br/b");
  });

  it("does not shift roles when a signer is missing from the response", () => {
    // createDocument filters its result to signers that came back with a
    // short_link. Under positional matching, one dropped signer moved every
    // later role up by one and filed the candidate's signature as the parent's.
    const mapped = mapSignersToRoles(ours, [
      api("Tech Solutions LTDA", "a"),
      api("Ana Silva", "c"),
    ]);

    expect(mapped.map((m) => m.role)).toEqual(["company", "parent_guardian"]);
  });

  it("matches names regardless of accents, case and spacing", () => {
    const mapped = mapSignersToRoles(ours, [
      api("INSTITUICAO  FEDERAL ", "d"),
      api("maria silva", "b"),
    ]);
    expect(mapped.map((m) => m.role)).toEqual(["educational_institution", "candidate"]);
  });

  it("falls back to position when a name comes back altered", () => {
    // Autentique echoes the name verbatim today. If that ever changes, order is
    // still the order we sent, so the mapping degrades rather than breaking.
    const mapped = mapSignersToRoles(ours, [
      api("Tech Solutions LTDA", "a"),
      api("M. Silva", "b"),
    ]);
    expect(mapped.map((m) => m.role)).toEqual(["company", "candidate"]);
  });

  it("never binds one of our signers to two API signers", () => {
    // Two people with the same name must not both resolve to the same role.
    const dupes = [
      { email: "a@test.com", name: "Maria Silva", role: "candidate" },
      { email: "b@test.com", name: "Maria Silva", role: "parent_guardian" },
    ];
    const mapped = mapSignersToRoles(dupes, [api("Maria Silva", "x"), api("Maria Silva", "y")]);

    expect(mapped.map((m) => m.role).sort()).toEqual(["candidate", "parent_guardian"]);
    expect(new Set(mapped.map((m) => m.email)).size).toBe(2);
  });

  it("reports unknown rather than guessing when there is nothing left to match", () => {
    // Better to record "unknown" than to invent a role: getDocumentsToSign now
    // refuses to infer signature flags from an unresolved document.
    const mapped = mapSignersToRoles(
      [{ email: "empresa@test.com", name: "Tech Solutions LTDA", role: "company" }],
      [api("Tech Solutions LTDA", "a"), api("Alguém Inesperado", "z")],
    );

    expect(mapped[0].role).toBe("company");
    expect(mapped[1].role).toBe("unknown");
  });

  it("handles an empty response without throwing", () => {
    expect(mapSignersToRoles(ours, [])).toEqual([]);
    expect(mapSignersToRoles([], [api("Maria Silva", "b")])[0].role).toBe("unknown");
  });
});
