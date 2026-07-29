// Derive canonical skill tags for every job and candidate (migration 135).
//
// Safe to re-run: skill_tags is derived, never typed, so this recomputes from
// the human text every time. Run it after changing skillTags.ts.
//
//   npx tsx backend/scripts/backfill-skill-tags.ts --dry-run
//   npx tsx backend/scripts/backfill-skill-tags.ts
import { createClient } from '@supabase/supabase-js';
import { extractSkillTags, deriveJobSkillTags } from '../services/matching/skillTags';

const DRY = process.argv.includes('--dry-run');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

function asArray(value: any): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  if (typeof value === 'string' && value.trim()) return [value];
  return [];
}

async function backfill(
  table: 'jobs' | 'candidates',
  sourceColumn: 'required_skills' | 'skills',
) {
  const extra = table === 'jobs' ? ', requirements' : '';
  const { data, error } = await sb.from(table).select(`id, ${sourceColumn}, skill_tags${extra}`);
  if (error) throw error;

  let changed = 0;
  let nowTagged = 0;
  let stillEmpty = 0;
  const histogram = new Map<string, number>();

  for (const row of (data || []) as any[]) {
    // Jobs fall back to the free-text Requisitos box, which is the field the
    // agency actually edits; required_skills is only populated at creation.
    const tags = table === 'jobs'
      ? deriveJobSkillTags(asArray(row[sourceColumn]), row.requirements)
      : extractSkillTags(asArray(row[sourceColumn]));
    for (const t of tags) histogram.set(t, (histogram.get(t) || 0) + 1);
    if (tags.length) nowTagged++;
    else stillEmpty++;

    const before = JSON.stringify(asArray(row.skill_tags).sort());
    if (before === JSON.stringify(tags)) continue;
    changed++;

    if (!DRY) {
      const { error: upErr } = await sb.from(table).update({ skill_tags: tags }).eq('id', row.id);
      if (upErr) console.error(`  ! ${table} ${row.id}:`, upErr.message);
    }
  }

  console.log(`\n${table}: ${data?.length ?? 0} rows`);
  console.log(`  tagged      : ${nowTagged}`);
  console.log(`  no tags     : ${stillEmpty}`);
  console.log(`  ${DRY ? 'would update' : 'updated'}: ${changed}`);
  console.log('  most common tags:');
  [...histogram.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .forEach(([t, n]) => console.log(`    ${String(n).padStart(4)}  ${t}`));
}

(async () => {
  console.log(DRY ? '=== DRY RUN, nothing written ===' : '=== writing skill_tags ===');
  await backfill('jobs', 'required_skills');
  await backfill('candidates', 'skills');
  console.log('\ndone.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
