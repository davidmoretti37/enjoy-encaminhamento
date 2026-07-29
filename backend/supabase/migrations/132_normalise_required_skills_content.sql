-- 132: Clean the CONTENT of jobs.required_skills.
--
-- 130 fixed the TYPE (everything is a jsonb array now) but not the content.
-- Two defects survived, both of which make skill matching useless because
-- scoreSkills() does exact / synonym / related lookups against whole elements:
--
--   a) DOUBLE-ENCODED JSON. One job stored the *string* '["Habilitação AB"]',
--      so normalising produced a one-element array whose only element is the
--      literal text ["Habilitação AB"] — brackets, quotes and all. It can never
--      match the skill "Habilitação AB".
--
--   b) NEWLINE-SEPARATED LISTS. 130 split on , ; and / but not on newlines, so
--      'Perfil proativo e criativo⏎Habilidades com Canva, Capcut, Instagram...'
--      stayed as a single giant element that matches nothing.
--
-- This unwraps (a), splits on newlines as well as , ; and /, trims, drops
-- empties, and de-duplicates. Idempotent — safe to re-run.

BEGIN;

-- (a) Unwrap elements that are themselves JSON-array text.
UPDATE jobs j
SET required_skills = sub.fixed
FROM (
  SELECT
    j2.id,
    COALESCE(jsonb_agg(DISTINCT x.val) FILTER (WHERE x.val <> ''), '[]'::jsonb) AS fixed
  FROM jobs j2
  CROSS JOIN LATERAL jsonb_array_elements_text(j2.required_skills) AS elem
  CROSS JOIN LATERAL (
    SELECT btrim(
      CASE
        -- Element is itself a JSON array -> take its elements
        WHEN btrim(elem) LIKE '[%]'
          THEN (SELECT string_agg(inner_e, ',')
                FROM jsonb_array_elements_text(btrim(elem)::jsonb) AS inner_e)
        ELSE elem
      END
    ) AS val
  ) AS x
  WHERE jsonb_typeof(j2.required_skills) = 'array'
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(j2.required_skills) e
      WHERE btrim(e) LIKE '[%]'
    )
  GROUP BY j2.id
) sub
WHERE j.id = sub.id;

-- (b) Re-split every element on newlines, commas, semicolons and slashes.
UPDATE jobs j
SET required_skills = sub.fixed
FROM (
  SELECT
    j2.id,
    COALESCE(
      jsonb_agg(DISTINCT part) FILTER (WHERE length(part) > 1),
      '[]'::jsonb
    ) AS fixed
  FROM jobs j2
  CROSS JOIN LATERAL jsonb_array_elements_text(j2.required_skills) AS elem
  CROSS JOIN LATERAL (
    SELECT btrim(p) AS part
    FROM regexp_split_to_table(elem, '\s*[,;/\n\r]+\s*') AS p
  ) AS s
  WHERE jsonb_typeof(j2.required_skills) = 'array'
  GROUP BY j2.id
) sub
WHERE j.id = sub.id;

COMMIT;
