-- Add 'pj' to hiring_processes hiring_type check constraint
ALTER TABLE hiring_processes DROP CONSTRAINT IF EXISTS hiring_processes_hiring_type_check;
ALTER TABLE hiring_processes ADD CONSTRAINT hiring_processes_hiring_type_check
  CHECK (hiring_type IN ('estagio', 'clt', 'menor-aprendiz', 'menor_aprendiz', 'pj', 'jovem_aprendiz'));
