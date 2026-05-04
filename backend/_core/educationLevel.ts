// Maps frontend granular education values to the database `education_level` enum.
// DB enum: fundamental | medio | superior | pos-graduacao | mestrado | doutorado
const EDUCATION_LEVEL_MAP: Record<string, string> = {
  fundamental_incompleto: "fundamental",
  fundamental_completo: "fundamental",
  medio_incompleto: "medio",
  medio_completo: "medio",
  tecnico: "medio",
  superior_incompleto: "superior",
  superior_completo: "superior",
  pos_graduacao: "pos-graduacao",
  mestrado: "mestrado",
  doutorado: "doutorado",
};

const VALID_ENUM_VALUES = new Set([
  "fundamental",
  "medio",
  "superior",
  "pos-graduacao",
  "mestrado",
  "doutorado",
]);

export function mapEducationLevel(input: string | null | undefined): string | null | undefined {
  if (input === null || input === undefined || input === "") return input;
  if (EDUCATION_LEVEL_MAP[input]) return EDUCATION_LEVEL_MAP[input];
  if (VALID_ENUM_VALUES.has(input)) return input;
  return null;
}
