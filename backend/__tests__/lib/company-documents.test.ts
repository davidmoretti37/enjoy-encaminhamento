// Filing company documents by type and by person.
//
// Every filename below is verbatim from production. The operator's naming is
// inconsistent by nature (she types what makes sense at the time), so inference
// is judged against what she actually uploaded, not against tidy examples.
//
// This exists because the employee-documents panel read `hiring_processes`,
// which is empty for every company, while the upload button wrote to the
// company's service-contract list. Uploads succeeded and stayed invisible; she
// re-uploaded the same TCE three times.
import { describe, it, expect } from "vitest";
import {
  inferCategory,
  inferEmployee,
  withInferredMeta,
  categoryLabel,
  EMPLOYEE_CATEGORIES,
} from "../../lib/companyDocuments";

describe("inferCategory", () => {
  it("reads TCE as the estágio contract even with underscores around it", () => {
    // Underscore is a word character, so /\btce\b/ never matched "TCE_CTR4382".
    expect(inferCategory("employee-contract-TCE_CTR4382_Maria_Clara__assinado___1_.pdf"))
      .toBe("contrato_estagio");
  });

  it("treats Termo_Estagio as the contract, not a generic termo", () => {
    expect(inferCategory("Termo_Estagio_ANEC_ Nhicoly 4350.pdf")).toBe("contrato_estagio");
    expect(inferCategory("Termo_Estagio_ANEC_Seguro - Yasmin - 4397 -( Mais Você ).pdf"))
      .toBe("contrato_estagio");
  });

  it("separates the company agreement from a person's paperwork", () => {
    expect(inferCategory("Contrato Parceria Estágio - Clínica Mais Você LTDA.pdf"))
      .toBe("contrato_empresa");
    expect(inferCategory("CONTRATO MAIS VOCE (1).pdf")).toBe("contrato_empresa");
  });

  it("recognises the remaining real types", () => {
    expect(inferCategory("Certificado Seguro de Vida - Yasmin Cristine de Souza.pdf")).toBe("seguro");
    expect(inferCategory("Carta de Encaminhamento - Nhicoly 4350.pdf")).toBe("encaminhamento");
    expect(inferCategory("TAXA ESTÁGIO - MAIS VOCÊ ( YASMIN ).pdf")).toBe("taxa");
    expect(inferCategory("TERMO DE COMPROMETIMENTO - Nhicoly [conformidade].pdf")).toBe("termo");
    expect(inferCategory("Atestado médico Maria Clara.pdf")).toBe("atestado");
  });

  it("falls back to outros rather than guessing", () => {
    expect(inferCategory("documento sem nome claro.pdf")).toBe("outros");
  });
});

describe("inferEmployee", () => {
  it("splits names the operator types without spaces", () => {
    expect(inferEmployee("employee-contract-TERMO_ALUNO_CONTRATADO_MariaClara_4382__assinado_.pdf"))
      .toBe("Maria Clara");
  });

  it("ignores the candidate reference numbers", () => {
    // 4350 / 4382 / 4397 are candidate refs, and ctr4382 is one with a prefix.
    expect(inferEmployee("Termo_Estagio_ANEC_ Nhicoly 4350.pdf")).toBe("Nhicoly");
    expect(inferEmployee("employee-contract-TCE_CTR4382_Maria_Clara__assinado_.pdf"))
      .toBe("Maria Clara");
  });

  it("strips the document vocabulary, including plurals", () => {
    // "Encaminhamentos" plural used to survive and become part of the name.
    expect(inferEmployee("Carta de Encaminhamentos Mayane 4352 - Mais Você.pdf")).toBe("Mayane");
  });

  it("keeps a real multi-part name", () => {
    expect(inferEmployee("Certificado Seguro de Vida - Yasmin Cristine de Souza.pdf"))
      .toBe("Yasmin Cristine Souza");
  });

  it("returns null when there is no name to find", () => {
    expect(inferEmployee("CONTRATO MAIS VOCE (1).pdf")).toBeNull();
    expect(inferEmployee("Contrato Parceria Estágio - Clínica Mais Você LTDA.pdf")).toBeNull();
  });
});

describe("withInferredMeta", () => {
  it("never overwrites a category already chosen by the operator", () => {
    const file = { url: "u", name: "TCE_Maria.pdf", category: "outros" as const, employee: "Ana" };
    expect(withInferredMeta(file)).toEqual(file);
  });

  it("leaves a company agreement unattributed to any person", () => {
    const out = withInferredMeta({ url: "u", name: "CONTRATO MAIS VOCE (1).pdf" });
    expect(out.category).toBe("contrato_empresa");
    expect(out.employee).toBeNull();
  });

  it("files the three duplicate TCE uploads under the same person and type", () => {
    // She uploaded this file three times because it kept not appearing. All three
    // must land together rather than scattering.
    const names = [
      "employee-contract-TCE_CTR4382_Maria_Clara__assinado___1_.pdf",
      "employee-contract-TCE_CTR4382_Maria_Clara__assinado___1_.pdf",
      "employee-contract-TCE_CTR4382_Maria_Clara__assinado___1_.pdf",
    ];
    const metas = names.map((name) => withInferredMeta({ url: "u", name }));
    expect(new Set(metas.map((m) => m.employee))).toEqual(new Set(["Maria Clara"]));
    expect(new Set(metas.map((m) => m.category))).toEqual(new Set(["contrato_estagio"]));
  });

  it("derives something usable for every real production filename", () => {
    const production = [
      "Termo_Estagio_ANEC_ Nhicoly 4350.pdf",
      "Carta de Encaminhamento - Nhicoly 4350 - Premier Contabilidade.pdf",
      "TERMO DE COMPROMETIMENTO - Nhicoly - Premier Contabilidade [conformidade].pdf",
      "Contrato Parceria Estágio - Clínica Mais Você LTDA.pdf",
      "employee-contract-TERMO_ALUNO_CONTRATADO_MariaClara_4382__assinado_.pdf",
      "employee-contract-TERMO_COMPROMETIMENTO_USO_IMAGEM_MariaClara_4382__assinado_.pdf",
      "employee-contract-TCE_CTR4382_Maria_Clara__assinado___1_.pdf",
      "CONTRATO MAIS VOCE (1).pdf",
      "Certificado Seguro de Vida - Yasmin Cristine de Souza.pdf",
      "TAXA ESTÁGIO - MAIS VOCÊ ( YASMIN ).pdf",
      "Termo_Estagio_ANEC_Seguro - Yasmin - 4397 -( Mais Você ).pdf",
      "Carta de Encaminhamentos Mayane 4352 - Mais Você.pdf",
      "Taxa de Gestão de Estágio Mayane - Yasmin- Mais Você.pdf",
    ];

    for (const name of production) {
      const meta = withInferredMeta({ url: "u", name });
      expect(meta.category, name).toBeTruthy();
      expect(categoryLabel(meta.category), name).not.toBe(undefined);
      // A person's document must never silently claim to be the company contract.
      if (meta.category !== "contrato_empresa") {
        expect(EMPLOYEE_CATEGORIES, name).toContain(meta.category);
      }
    }
  });

  it("puts nothing in a category that does not exist", () => {
    const meta = withInferredMeta({ url: "u", name: "arquivo qualquer.pdf" });
    expect(categoryLabel(meta.category)).toBe("Outros");
  });
});
