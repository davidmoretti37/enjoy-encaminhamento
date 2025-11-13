# Simple Fix Plan - Affiliate Dashboard

## Current Issue
The affiliate regional pages are trying to query data with relationships that don't exist:
- `candidates.school_id` doesn't exist
- `contracts.affiliate_id` doesn't exist
- No FK between candidates and schools

## Simple Solution

Instead of showing regional data filtered by affiliate_id (which requires complex relationships), just show:

### Affiliate Dashboard:
1. **Schools in their region** - ✓ Already works (schools.affiliate_id exists)
2. **Basic stats** - Just counts, no complex joins

### Simplified Pages:
- **Schools page** - Shows schools where `affiliate_id = current_affiliate.id` ✓
- **Candidates page** - Show ALL candidates (or hide this page for now)
- **Jobs page** - Show ALL jobs (or hide this page for now)
- **Applications page** - Show ALL applications (or hide this page for now)
- **Contracts page** - Show ALL contracts (or hide this page for now)
- **Payments page** - Show payments for their schools only

## What to Do

**Option 1: Simplify the dashboard (Quick fix)**
- Comment out the broken queries
- Show only schools management (which works)
- Hide other menu items until we build proper relationships

**Option 2: Show all data (No filtering)**
- Remove affiliate filtering
- Show all candidates/jobs/etc to franchise owners
- Not ideal but works immediately

**Option 3: Build proper relationships (Takes time)**
- Add school_id to candidates table
- Add proper foreign keys
- Update all queries
- More work but correct long-term

Which option do you prefer?
