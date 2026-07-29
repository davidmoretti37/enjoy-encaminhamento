// Canonical skill tag extraction.
//
// Every case below is a verbatim string from production. The point of this
// module is that job requirements and candidate skills are free text written by
// different people who never agree on wording, so the tests are written against
// what people actually typed rather than against tidy examples.
import { describe, it, expect } from "vitest";
import { extractSkillTags, deriveJobSkillTags } from "../../services/matching/skillTags";

describe("extractSkillTags", () => {
  it("pulls every skill out of a sentence that lists several", () => {
    // One candidate put eight skills in one box. Compared as a whole string it
    // matched nothing; that single row scored zero on skills.
    const tags = extractSkillTags([
      "Atendimento ao cliente Comunicação eficaz Organização Trabalho em equipe " +
      "Proatividade Responsabilidade Informática básica Facilidade de aprendizagem",
    ]);

    expect(tags).toEqual(expect.arrayContaining([
      "atendimento-ao-cliente", "comunicacao", "organizacao", "trabalho-em-equipe",
      "proatividade", "responsabilidade", "informatica-basica", "aprendizado-rapido",
    ]));
  });

  it("collapses the many spellings of one skill onto a single tag", () => {
    // "Comunicação" (23 candidates), "Comunicativa" (12), "Boa comunicação" (10),
    // "Comunicativo" (8) and a typo were five different keys to the matcher.
    for (const variant of [
      "Comunicação", "Comunicativa", "Comunicativo", "Boa comunicação",
      "comunicação", "Comunicatica", "Comunicação eficiente", "Boa oratória",
    ]) {
      expect(extractSkillTags([variant])).toContain("comunicacao");
    }
  });

  it("reads a job requirement written as prose", () => {
    expect(extractSkillTags(["Ter interesse por moda e criação de conteúdo."]))
      .toContain("criacao-de-conteudo");
    expect(extractSkillTags(["criativo(a) e proativo(a)."]))
      .toEqual(expect.arrayContaining(["criatividade", "proatividade"]));
  });

  it("survives the JSON debris left by the old import", () => {
    // These are real stored values: a JSON array that was split on commas,
    // leaving fragments with the brackets and quotes still attached.
    expect(extractSkillTags(['["Comunicativo'])).toContain("comunicacao");
    expect(extractSkillTags(['proativo"]'])).toContain("proatividade");
    expect(extractSkillTags(['trabalha bem em equipe."]'])).toContain("trabalho-em-equipe");
  });

  it("handles escape sequences that were stringified into the data", () => {
    // Literal backslash-t, not a tab. Without stripping it the following word
    // fuses into "tfacilidade" and no pattern can match.
    const stored = "\\n\u2022\\tFacilidade de aprendizagem e disposição para compartilhar conhecimento";
    expect(extractSkillTags([stored])).toContain("aprendizado-rapido");
  });

  it("ignores entries that carry no skill", () => {
    for (const noise of ["Nenhuma", "competencias requeriads", "A", "Cursando Ensino Médio", ""]) {
      expect(extractSkillTags([noise])).toEqual([]);
    }
  });

  it("requires word boundaries, so short tags do not match inside other words", () => {
    // "ia" must not fire on "familia", "sac" must not fire on "sacola".
    expect(extractSkillTags(["Cuido da familia"])).not.toContain("ia");
    expect(extractSkillTags(["Carrego sacolas"])).not.toContain("sac");
    expect(extractSkillTags(["Conhecimento de ia"])).toContain("ia");
  });

  it("deduplicates across entries and returns a stable order", () => {
    const a = extractSkillTags(["Comunicação", "Comunicativa", "Boa comunicação"]);
    expect(a).toEqual(["comunicacao"]);
    expect(extractSkillTags(["Proatividade", "Organização"]))
      .toEqual(extractSkillTags(["Organização", "Proatividade"]));
  });

  it("tolerates null and undefined entries", () => {
    expect(extractSkillTags([null, undefined, "Proativo"])).toEqual(["proatividade"]);
    expect(extractSkillTags([])).toEqual([]);
  });
});

describe("deriveJobSkillTags", () => {
  it("prefers the structured list when it yields tags", () => {
    const tags = deriveJobSkillTags(["Excel", "Word"], "Precisa saber vender muito bem");

    expect(tags).toEqual(expect.arrayContaining(["excel", "word"]));
    // The prose is not merged in: scoreSkills divides by the number of required
    // tags, so padding the list would depress every candidate's score.
    expect(tags).not.toContain("vendas");
  });

  it("falls back to the Requisitos prose the agency actually edits", () => {
    // required_skills is only written at creation, so an edited vaga would
    // otherwise keep matching against whatever it was created with.
    expect(deriveJobSkillTags([], "Precisa ser comunicativo e organizado"))
      .toEqual(expect.arrayContaining(["comunicacao", "organizacao"]));
    expect(deriveJobSkillTags(null, "Atendimento ao público e trabalho em equipe"))
      .toEqual(expect.arrayContaining(["atendimento-ao-cliente", "trabalho-em-equipe"]));
  });

  it("falls back when the structured list is present but pure noise", () => {
    expect(deriveJobSkillTags(["Nenhuma"], "Boa comunicação")).toEqual(["comunicacao"]);
  });

  it("returns nothing when neither source says anything", () => {
    expect(deriveJobSkillTags([], null)).toEqual([]);
    expect(deriveJobSkillTags(undefined, undefined)).toEqual([]);
  });
});
