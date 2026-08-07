// Who a candidate email appears to come from, and where their reply goes.
//
// A candidate confirmed an interview ("Está confirmado e estarei lá no horário")
// and the reply landed in the founder's personal inbox, because every message
// went out from the one global SMTP account with no Reply-To. The operator
// running that interview never saw the confirmation.
//
// The address itself must stay the authenticated mailbox: sending as an address
// we do not control fails SPF/DKIM and is filed as spam. So the agency controls
// the display name and the Reply-To, not the address.
import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMail = vi.fn().mockResolvedValue({ messageId: "x" });

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail })) },
  createTransport: vi.fn(() => ({ sendMail })),
}));

vi.mock("../../_core/env", () => ({
  ENV: {
    smtp: {
      host: "smtp.test",
      port: 587,
      user: "contato@anecrh.com.br",
      pass: "secret",
      emailFrom: "contato@anecrh.com.br",
      units: {},
    },
  },
}));

const getAgencyById = vi.fn();
vi.mock("../../db", () => ({ getAgencyById: (...a: any[]) => getAgencyById(...a) }));

import { sendEmail, senderIdentityForAgencyId } from "../../routers/email";

beforeEach(() => {
  sendMail.mockClear();
  getAgencyById.mockReset();
});

describe("senderIdentityForAgencyId", () => {
  it("uses the agency's configured display name and reply-to", async () => {
    getAgencyById.mockResolvedValue({
      agency_name: "ANEC Ipatinga",
      city: "Ipatinga",
      sender_display_name: "ANEC São Mateus",
      reply_to_email: "saomateus@anecrh.com.br",
    });

    const id = await senderIdentityForAgencyId("ag-1");
    expect(id.fromName).toBe("ANEC São Mateus");
    expect(id.replyTo).toBe("saomateus@anecrh.com.br");
  });

  it("falls back to the agency's own name and contact address", async () => {
    // Both production agencies already have @anecrh.com.br contact addresses, so
    // this fallback alone routes replies correctly before anyone configures a thing.
    getAgencyById.mockResolvedValue({
      agency_name: "Agência de Uberlândia",
      city: "Uberlândia",
      email: "uberlandia@anecrh.com.br",
      sender_display_name: null,
      reply_to_email: null,
    });

    const id = await senderIdentityForAgencyId("ag-2");
    expect(id.fromName).toBe("Agência de Uberlândia");
    expect(id.replyTo).toBe("uberlandia@anecrh.com.br");
  });

  it("returns the plain default when there is no agency", async () => {
    // 10 of 299 candidates have no agency_id at all.
    const id = await senderIdentityForAgencyId(null);
    expect(id.unit).toBe("default");
    expect(id.replyTo).toBeUndefined();
  });

  it("does not throw when the agency lookup fails", async () => {
    getAgencyById.mockRejectedValue(new Error("db down"));
    await expect(senderIdentityForAgencyId("ag-3")).resolves.toEqual({ unit: "default" });
  });
});

describe("sendEmail sender presentation", () => {
  it("keeps the authenticated address and only changes the display name", async () => {
    // Rewriting the address itself would fail SPF/DKIM.
    await sendEmail("cand@test.com", "Assunto", "<p>oi</p>", "default", {
      fromName: "ANEC São Mateus",
      replyTo: "saomateus@anecrh.com.br",
    });

    const sent = sendMail.mock.calls[0][0];
    expect(sent.from).toBe('"ANEC São Mateus" <contato@anecrh.com.br>');
    expect(sent.from).toContain("contato@anecrh.com.br");
    expect(sent.replyTo).toBe("saomateus@anecrh.com.br");
  });

  it("sets Reply-To so the candidate's answer reaches the operator", async () => {
    await sendEmail("cand@test.com", "s", "<p>h</p>", "default", {
      replyTo: "mae@anecrh.com.br",
    });
    expect(sendMail.mock.calls[0][0].replyTo).toBe("mae@anecrh.com.br");
  });

  it("omits Reply-To entirely rather than sending an empty one", async () => {
    await sendEmail("cand@test.com", "s", "<p>h</p>", "default", { replyTo: "  " });
    expect(sendMail.mock.calls[0][0]).not.toHaveProperty("replyTo");
  });

  it("still works for the callers that pass no identity at all", async () => {
    await sendEmail("cand@test.com", "s", "<p>h</p>");
    const sent = sendMail.mock.calls[0][0];
    expect(sent.from).toBe("contato@anecrh.com.br");
    expect(sent).not.toHaveProperty("replyTo");
  });

  it("neutralises a quote in the display name so the header cannot be split", async () => {
    await sendEmail("cand@test.com", "s", "<p>h</p>", "default", {
      fromName: 'ANEC "Sul"',
    });
    const from = sendMail.mock.calls[0][0].from;
    expect(from).toBe('"ANEC Sul" <contato@anecrh.com.br>');
    expect(from.match(/"/g)).toHaveLength(2);
  });
});
