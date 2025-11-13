# Affiliate System - Current Status & Issues

## Problem

There's a conflict between old migrations and the new affiliate system:

### Old Migrations (DON'T USE):
- `002_franchise_structure.sql` - Creates franchises table
- `003_corriculos_mvp.sql` - Renames affiliates → franchises

### New System (WHAT WE BUILT):
- Uses `affiliates` table (not `franchises`)
- Migration `009_affiliate_invitations.sql` - Creates affiliate_invitations
- Migration `012_add_affiliate_to_schools.sql` - Adds affiliate_id to schools
- Migration `013_remove_franchises_table.sql` - Removes redundant franchises table

## Current Database State

We need to verify what's actually in your database:

**Option 1:** Database has `affiliates` table
- Good! Just need to add missing columns/relationships

**Option 2:** Database has `franchises` table (from migration 003)
- Need to rename `franchises` back to `affiliates`
- Or update all code to use `franchises` instead

## Missing Relationships

The affiliate system code expects these relationships that don't exist:

1. **candidates.school_id** - Links candidate to school
   - Currently: candidates are NOT linked to schools
   - Your model: candidates apply to jobs at companies (not schools)

2. **contracts.affiliate_id** - Links contract to franchise owner
   - Currently: contracts might have franchise_id instead

## The Real Business Model

Based on the errors, it seems your actual model is:
- **Companies** (empresas) post **jobs** (vagas)
- **Candidates** (candidatos) apply to **jobs** via **applications** (candidaturas)
- **Contracts** (contratos) are created when candidate is hired
- **Schools** (escolas) are something different?

## Questions to Clarify:

1. **What are "schools" in your system?**
   - Are they the same as "companies"?
   - Or are they educational institutions that are separate from companies?

2. **Do you actually have schools table?**
   - Or do you just have companies table?

3. **What should franchise owners manage?**
   - Companies in their city?
   - Schools in their city?
   - Both?

## Recommended Next Steps:

1. Check your actual database schema in Supabase
2. Tell me which tables actually exist:
   - Do you have `affiliates` or `franchises`?
   - Do you have `schools` or just `companies`?
   - What columns does `candidates` table have?
   - What columns does `contracts` table have?

3. Once we know the real schema, I can fix the affiliate system to match reality

