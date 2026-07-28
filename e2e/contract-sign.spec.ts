import { test, expect } from "@playwright/test";
import { seedFixture, purgeHiringProcessesForCompany } from "./_helpers/seed";
import { admin } from "./_helpers/supabase";
import { E2E_ENV } from "./_helpers/env";

// Hit the Autentique webhook directly (it's an Express POST handler, no auth).
async function postWebhook(payload: any) {
  const url = `${E2E_ENV.baseUrl}/api/webhooks/autentique`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
}

test.describe("Contract signing via webhook", () => {
  test("signature.accepted webhook flips hiring_processes.company_signed", async () => {
    const fx = await seedFixture();
    await purgeHiringProcessesForCompany(fx.company.companyId);

    // Seed a hiring_process + autentique_documents tracking row + signing_invitations
    const { data: hp, error: hpErr } = await (admin.from("hiring_processes") as any)
      .insert({
        company_id: fx.company.companyId,
        candidate_id: fx.candidates[0].candidateId,
        job_id: fx.jobs[0].id,
        hiring_type: "clt",
        status: "pending_signatures",
        start_date: new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10),
      })
      .select("id")
      .single();
    expect(hpErr).toBeNull();

    const autentiqueDocId = `mock-doc-${Date.now()}`;
    const companySignerId = `mock-signer-company-${Date.now()}`;
    const candidateSignerId = `mock-signer-candidate-${Date.now()}`;

    await (admin.from("autentique_documents") as any).insert({
      autentique_document_id: autentiqueDocId,
      context_type: "hiring_contract",
      context_id: hp.id,
      document_name: "Contrato CLT (mock)",
      status: "pending",
      signers: [
        {
          autentique_signer_id: companySignerId,
          email: "company@example.test",
          name: "Test Company",
          role: "company",
          signed_at: null,
        },
        {
          autentique_signer_id: candidateSignerId,
          email: "candidate@example.test",
          name: "Test Candidate",
          role: "candidate",
          signed_at: null,
        },
      ],
    });

    // 1. Fire signature.accepted for company
    const r1 = await postWebhook({
      event: {
        type: "signature.accepted",
        data: {
          object: {
            document: { id: autentiqueDocId },
            signature: { public_id: companySignerId, email: "company@example.test" },
          },
        },
      },
    });
    expect(r1.status).toBe(200);

    const { data: afterCompany } = await (admin.from("hiring_processes") as any)
      .select("company_signed, candidate_signed, status")
      .eq("id", hp.id)
      .single();
    expect(afterCompany?.company_signed).toBe(true);
    expect(afterCompany?.candidate_signed).toBeFalsy();

    // 2. Fire signature.accepted for candidate
    const r2 = await postWebhook({
      event: {
        type: "signature.accepted",
        data: {
          object: {
            document: { id: autentiqueDocId },
            signature: { public_id: candidateSignerId, email: "candidate@example.test" },
          },
        },
      },
    });
    expect(r2.status).toBe(200);

    const { data: afterCandidate } = await (admin.from("hiring_processes") as any)
      .select("company_signed, candidate_signed")
      .eq("id", hp.id)
      .single();
    expect(afterCandidate?.candidate_signed).toBe(true);

    // 3. document.finished should flip the autentique doc + (for CLT) trigger active
    const r3 = await postWebhook({
      event: {
        type: "document.finished",
        data: { object: { id: autentiqueDocId, files: { signed: "https://example.test/signed.pdf" } } },
      },
    });
    expect(r3.status).toBe(200);

    const { data: doc } = await (admin.from("autentique_documents") as any)
      .select("status, signed_pdf_url")
      .eq("autentique_document_id", autentiqueDocId)
      .single();
    expect(doc?.status).toBe("signed");

    const { data: finalProcess } = await (admin.from("hiring_processes") as any)
      .select("status")
      .eq("id", hp.id)
      .single();
    // CLT path transitions to pending_payment, not active, after signatures
    expect(["pending_payment", "active"]).toContain(finalProcess?.status);
  });

  test("webhook is idempotent — replaying signature.accepted does not double-flip", async () => {
    const fx = await seedFixture();
    await purgeHiringProcessesForCompany(fx.company.companyId);

    const { data: hp } = await (admin.from("hiring_processes") as any)
      .insert({
        company_id: fx.company.companyId,
        candidate_id: fx.candidates[0].candidateId,
        job_id: fx.jobs[0].id,
        hiring_type: "clt",
        status: "pending_signatures",
        start_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .single();

    const docId = `mock-idem-${Date.now()}`;
    const signerId = `mock-signer-${Date.now()}`;
    await (admin.from("autentique_documents") as any).insert({
      autentique_document_id: docId,
      context_type: "hiring_contract",
      context_id: hp.id,
      document_name: "Idem test",
      status: "pending",
      signers: [
        { autentique_signer_id: signerId, email: "x@x.test", name: "X", role: "company", signed_at: null },
      ],
    });

    const payload = {
      event: {
        type: "signature.accepted",
        data: {
          object: {
            document: { id: docId },
            signature: { public_id: signerId, email: "x@x.test" },
          },
        },
      },
    };

    await postWebhook(payload);
    const { data: first } = await (admin.from("autentique_documents") as any)
      .select("signers")
      .eq("autentique_document_id", docId)
      .single();
    const firstSignedAt = (first?.signers as any[])?.[0]?.signed_at;
    expect(firstSignedAt).toBeTruthy();

    // Replay — signed_at must not change
    await postWebhook(payload);
    const { data: second } = await (admin.from("autentique_documents") as any)
      .select("signers")
      .eq("autentique_document_id", docId)
      .single();
    expect((second?.signers as any[])?.[0]?.signed_at).toBe(firstSignedAt);
  });
});
