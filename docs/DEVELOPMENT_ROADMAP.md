# 🗺️ Development Roadmap

## Overview

This roadmap outlines the path from current state (40% complete) to full specification compliance. Based on the project analysis, we've organized development into 3 phases spanning approximately 4-6 months.

**Current Progress:** ~40% complete
**Target:** 100% specification compliance
**Timeline:** 4-6 months (with focused development)

---

## Phase 1: MVP Core Features (4-6 weeks)

**Goal:** Create a functional recruitment platform that can register candidates, match them to jobs using AI, and facilitate basic hiring processes.

### 1.1 Candidate Registration Portal ⭐⭐⭐ CRITICAL
**Estimated Time:** 1-2 weeks
**Dependencies:** None

**Features:**
- [ ] Public registration page (no login required)
- [ ] Multi-step registration form
  - [ ] Step 1: Personal information (name, email, phone, CPF)
  - [ ] Step 2: Education history
  - [ ] Step 3: Work experience
  - [ ] Step 4: Skills and languages
  - [ ] Step 5: Preferences (job type, location, salary expectations)
- [ ] Form validation and error handling
- [ ] Email verification
- [ ] Welcome email after registration

**Technical Tasks:**
- [ ] Create `/register` public route
- [ ] Build multi-step form component with state management
- [ ] Implement form validation (Zod schemas)
- [ ] Create tRPC mutation for candidate registration
- [ ] Set up email verification flow
- [ ] Design responsive UI for mobile registration

**Files to Create/Update:**
```
client/src/pages/CandidateRegistration.tsx
client/src/components/registration/PersonalInfoStep.tsx
client/src/components/registration/EducationStep.tsx
client/src/components/registration/ExperienceStep.tsx
client/src/components/registration/SkillsStep.tsx
client/src/components/registration/PreferencesStep.tsx
server/routers/candidate.ts (update)
server/lib/email.ts (new)
```

### 1.2 Candidate Testing System ⭐⭐⭐ CRITICAL
**Estimated Time:** 2 weeks
**Dependencies:** 1.1 Candidate Registration

**Features:**
- [ ] Test management system for admins
  - [ ] Create/edit tests
  - [ ] Question bank (multiple choice, open-ended)
  - [ ] Test categories (general knowledge, language, technical, behavioral)
- [ ] Candidate test-taking interface
  - [ ] Timed tests
  - [ ] Progress saving
  - [ ] Question navigation
- [ ] Automatic scoring (multiple choice)
- [ ] Manual review interface (open-ended questions)
- [ ] Test results storage and reporting
- [ ] Behavioral profile assessment (DISC-style)
- [ ] Automatic resume generation from test results

**Technical Tasks:**
- [ ] Design test database schema
  ```sql
  CREATE TABLE tests (
    id UUID PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    category VARCHAR(50),
    duration_minutes INTEGER,
    passing_score INTEGER,
    is_active BOOLEAN
  );

  CREATE TABLE test_questions (
    id UUID PRIMARY KEY,
    test_id UUID REFERENCES tests(id),
    question_text TEXT,
    question_type VARCHAR(50), -- 'multiple_choice', 'open_ended', 'rating'
    options JSONB, -- for multiple choice
    correct_answer TEXT, -- for auto-grading
    points INTEGER
  );

  CREATE TABLE test_results (
    id UUID PRIMARY KEY,
    candidate_id UUID REFERENCES candidates(id),
    test_id UUID REFERENCES tests(id),
    score INTEGER,
    answers JSONB,
    completed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    reviewer_notes TEXT
  );
  ```
- [ ] Build test creation UI (admin)
- [ ] Build test-taking UI (candidate)
- [ ] Implement timer functionality
- [ ] Create auto-scoring logic
- [ ] Build manual review interface
- [ ] Generate PDF resume from profile + test results
- [ ] Integrate behavioral profile scoring

**Files to Create:**
```
supabase/migrations/003_candidate_testing.sql
client/src/pages/admin/TestManagement.tsx
client/src/pages/candidate/TakeTest.tsx
client/src/components/tests/TestCreator.tsx
client/src/components/tests/TestTaker.tsx
client/src/components/tests/TestReview.tsx
server/routers/tests.ts
server/lib/test-scoring.ts
server/lib/resume-generator.ts
```

### 1.3 AI Candidate Matching ⭐⭐⭐ CRITICAL
**Estimated Time:** 2 weeks
**Dependencies:** 1.1 Candidate Registration, 1.2 Testing System

**Features:**
- [ ] AI matching algorithm using LLM
- [ ] Match scoring (0-100)
- [ ] Match criteria:
  - [ ] Skills match
  - [ ] Education level match
  - [ ] Experience level match
  - [ ] Location proximity
  - [ ] Salary expectations
  - [ ] Availability match
  - [ ] Test results/scores
  - [ ] Behavioral profile fit
- [ ] Daily automatic matching cron job
- [ ] Match result storage
- [ ] Candidate notification on match
- [ ] School notification on match
- [ ] Match explanation (why this candidate matched)

**Technical Tasks:**
- [ ] Choose AI provider (OpenAI, Anthropic, or Gemini)
- [ ] Design matching prompt template
- [ ] Create matching algorithm
  ```typescript
  interface MatchCriteria {
    job: Job;
    candidate: Candidate;
    testResults: TestResult[];
  }

  interface MatchResult {
    score: number; // 0-100
    explanation: string;
    strengths: string[];
    concerns: string[];
    recommendation: 'highly_recommended' | 'recommended' | 'consider' | 'not_recommended';
  }
  ```
- [ ] Set up cron job (Supabase Edge Functions or node-cron)
- [ ] Create match results table
  ```sql
  CREATE TABLE ai_matches (
    id UUID PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    candidate_id UUID REFERENCES candidates(id),
    score INTEGER,
    explanation TEXT,
    strengths JSONB,
    concerns JSONB,
    recommendation VARCHAR(50),
    created_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ
  );
  ```
- [ ] Build match review UI (school dashboard)
- [ ] Implement notification system

**Files to Create:**
```
server/lib/ai-matching.ts
server/lib/openai-client.ts (or anthropic-client.ts)
server/cron/daily-matching.ts
supabase/migrations/004_ai_matching.sql
client/src/pages/school/CandidateMatches.tsx
client/src/components/matches/MatchCard.tsx
server/routers/matches.ts
```

### 1.4 Email Automation ⭐⭐⭐ CRITICAL
**Estimated Time:** 1 week
**Dependencies:** None (but integrates with all features)

**Features:**
- [ ] Email service integration (Resend or SendGrid)
- [ ] Email templates
  - [ ] Welcome email (candidate registration)
  - [ ] Email verification
  - [ ] Test invitation
  - [ ] Test completion confirmation
  - [ ] Job match notification (candidate)
  - [ ] New match notification (school)
  - [ ] Application received confirmation
  - [ ] Application status update
  - [ ] Interview invitation
  - [ ] Contract sent notification
- [ ] Email delivery tracking
- [ ] Email queue system
- [ ] Retry logic for failed emails
- [ ] Unsubscribe management

**Technical Tasks:**
- [ ] Set up email service account (Resend recommended)
- [ ] Create email templates (React Email or MJML)
- [ ] Build email sending utility
  ```typescript
  interface EmailTemplate {
    to: string;
    subject: string;
    template: 'welcome' | 'verification' | 'test_invitation' | ...;
    data: Record<string, any>;
  }

  async function sendEmail(email: EmailTemplate): Promise<void>
  ```
- [ ] Create email_logs table
  ```sql
  CREATE TABLE email_logs (
    id UUID PRIMARY KEY,
    recipient VARCHAR(320),
    subject VARCHAR(255),
    template VARCHAR(100),
    status VARCHAR(50), -- 'sent', 'failed', 'bounced'
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT
  );
  ```
- [ ] Implement email queue (Bull or pg-boss)
- [ ] Set up webhook handlers for delivery status
- [ ] Build email preview UI (admin)

**Files to Create:**
```
server/lib/email/client.ts
server/lib/email/templates/
server/lib/email/queue.ts
supabase/migrations/005_email_logs.sql
server/routers/emails.ts (admin email management)
```

### 1.5 Enhanced Job Management ⭐⭐ HIGH
**Estimated Time:** 1 week
**Dependencies:** 1.3 AI Matching

**Features:**
- [ ] Improved job posting UI
  - [ ] Rich text editor for description
  - [ ] Skills requirement builder
  - [ ] Salary range input
  - [ ] Benefits checklist
  - [ ] Location picker (with map)
- [ ] Job templates (save and reuse common job postings)
- [ ] Bulk job actions (publish, close, duplicate)
- [ ] Application review interface
  - [ ] Filter candidates by match score
  - [ ] Bulk application actions
  - [ ] Application notes and tags
- [ ] Candidate selection workflow
  - [ ] Move to interview stage
  - [ ] Schedule interviews
  - [ ] Send rejection emails
  - [ ] Generate offer

**Technical Tasks:**
- [ ] Update job posting form with new features
- [ ] Add job templates table
- [ ] Build application review dashboard
- [ ] Create interview scheduling component
- [ ] Implement bulk actions API

**Files to Update:**
```
client/src/pages/school/PostJob.tsx
client/src/pages/school/ManageApplications.tsx
client/src/components/jobs/JobForm.tsx
client/src/components/applications/ApplicationReview.tsx
server/routers/jobs.ts
```

### 1.6 Basic Contract Generation ⭐⭐ HIGH
**Estimated Time:** 1 week
**Dependencies:** 1.5 Job Management

**Features:**
- [ ] Contract template management (admin)
  - [ ] Create contract templates
  - [ ] Template variables ({{candidate_name}}, {{salary}}, etc.)
  - [ ] Multiple contract types (CLT, internship, menor aprendiz)
- [ ] Contract generation from template
- [ ] PDF generation with company branding
- [ ] Contract preview before sending
- [ ] Download contract
- [ ] Basic contract tracking (sent, viewed, downloaded)

**Technical Tasks:**
- [ ] Create contract_templates table
  ```sql
  CREATE TABLE contract_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    contract_type VARCHAR(50),
    template_content TEXT, -- HTML with {{variables}}
    variables JSONB, -- list of available variables
    is_active BOOLEAN,
    created_by UUID REFERENCES users(id)
  );
  ```
- [ ] Build template editor (admin)
- [ ] Implement variable replacement logic
- [ ] Integrate PDF generation library (Puppeteer or PDFKit)
- [ ] Create contract generation flow
- [ ] Build contract preview component

**Files to Create:**
```
supabase/migrations/006_contract_templates.sql
client/src/pages/admin/ContractTemplates.tsx
client/src/components/contracts/TemplateEditor.tsx
client/src/components/contracts/ContractPreview.tsx
server/lib/contract-generator.ts
server/lib/pdf-generator.ts
server/routers/contracts.ts (update)
```

---

## Phase 1 Success Criteria

**MVP is complete when:**
- [ ] Candidates can register and take tests
- [ ] AI automatically matches candidates to jobs daily
- [ ] Schools receive matched candidate notifications
- [ ] Schools can review applications and match scores
- [ ] Email notifications work for all major events
- [ ] Basic contracts can be generated and downloaded

**Metrics to track:**
- Candidate registration rate
- Test completion rate
- Average match score
- Time to first match
- Email delivery rate
- Contract generation time

---

## Phase 2: Automation & Integration (6-8 weeks)

**Goal:** Automate manual processes and integrate external services for digital signatures, payments, and communication.

### 2.1 Digital Signature Integration ⭐⭐⭐ CRITICAL
**Estimated Time:** 2 weeks
**Dependencies:** 1.6 Contract Generation

**Features:**
- [ ] DocuSign or similar integration
- [ ] Send contract for signature
- [ ] Track signature status (sent, viewed, signed, declined)
- [ ] Webhook handling for status updates
- [ ] Automatic notifications on signature events
- [ ] Store signed documents in Supabase Storage
- [ ] Counter-signature workflow (candidate → school → affiliate)
- [ ] Signature deadline reminders

**Technical Stack:**
- DocuSign API or HelloSign/Dropbox Sign
- Webhook endpoint for status updates
- Supabase Storage for signed PDFs

**Technical Tasks:**
- [ ] Choose signature provider
- [ ] Set up API credentials
- [ ] Build signature request flow
- [ ] Implement webhook handlers
- [ ] Update contracts table
  ```sql
  ALTER TABLE contracts ADD COLUMN signature_request_id VARCHAR(255);
  ALTER TABLE contracts ADD COLUMN signature_status VARCHAR(50);
  ALTER TABLE contracts ADD COLUMN signed_document_url TEXT;
  ALTER TABLE contracts ADD COLUMN candidate_signed_at TIMESTAMPTZ;
  ALTER TABLE contracts ADD COLUMN school_signed_at TIMESTAMPTZ;
  ALTER TABLE contracts ADD COLUMN affiliate_signed_at TIMESTAMPTZ;
  ```
- [ ] Build signature tracking UI
- [ ] Set up deadline reminder cron job

**Files to Create:**
```
server/lib/docusign-client.ts
server/webhooks/docusign.ts
server/cron/signature-reminders.ts
client/src/pages/contracts/SignatureStatus.tsx
supabase/migrations/007_digital_signatures.sql
```

### 2.2 Payment Gateway Integration ⭐⭐⭐ CRITICAL
**Estimated Time:** 2 weeks
**Dependencies:** 2.1 Digital Signatures

**Features:**
- [ ] Stripe or similar integration
- [ ] Recurring billing (monthly school subscriptions)
- [ ] One-time payments (affiliate commissions)
- [ ] Payment method storage
- [ ] Automatic payment retry on failure
- [ ] Payment receipts via email
- [ ] Late payment management
  - [ ] Grace period (7 days)
  - [ ] Automatic reminders
  - [ ] Service suspension after 30 days
  - [ ] Automatic contract cancellation after 60 days
- [ ] Refund handling
- [ ] Financial reporting dashboard

**Technical Stack:**
- Stripe (recommended for Brazilian market)
- Webhook handling for payment events
- Invoice generation

**Technical Tasks:**
- [ ] Set up Stripe account
- [ ] Create products and pricing
- [ ] Implement checkout flow
- [ ] Set up subscriptions
- [ ] Handle webhooks (payment succeeded, failed, subscription ended)
- [ ] Create subscription plans table
  ```sql
  CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    price_cents INTEGER,
    billing_interval VARCHAR(20), -- 'monthly', 'quarterly', 'annual'
    features JSONB,
    stripe_price_id VARCHAR(255)
  );

  CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    school_id UUID REFERENCES schools(id),
    plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255),
    status VARCHAR(50), -- 'active', 'past_due', 'canceled', 'suspended'
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ
  );
  ```
- [ ] Build payment dashboard (admin + school)
- [ ] Implement late payment flow
- [ ] Set up payment reminder cron job
- [ ] Generate invoices

**Files to Create:**
```
server/lib/stripe-client.ts
server/webhooks/stripe.ts
server/cron/payment-reminders.ts
server/lib/invoice-generator.ts
supabase/migrations/008_subscriptions.sql
client/src/pages/billing/Checkout.tsx
client/src/pages/billing/BillingDashboard.tsx
server/routers/billing.ts
```

### 2.3 Automated Feedback System ⭐⭐ HIGH
**Estimated Time:** 1 week
**Dependencies:** 2.1 Digital Signatures

**Features:**
- [ ] Monthly automatic feedback form generation
- [ ] Email feedback form to schools on contract anniversary
- [ ] Feedback form with ratings and comments
  - [ ] Performance rating (1-5)
  - [ ] Attendance rating
  - [ ] Quality of work rating
  - [ ] Team fit rating
  - [ ] Open comments
  - [ ] Recommendation to continue/replace
- [ ] Automatic notification on negative feedback
- [ ] Feedback review dashboard (affiliate)
- [ ] Candidate replacement workflow
- [ ] Feedback history and trends

**Technical Tasks:**
- [ ] Update feedback table schema
- [ ] Create feedback form templates
- [ ] Build feedback form UI (public link, no login)
- [ ] Set up monthly cron job
  ```typescript
  // Runs on 1st of every month
  // Find all active contracts
  // Send feedback request email to each school
  ```
- [ ] Implement feedback submission
- [ ] Create alert system for negative feedback
- [ ] Build feedback dashboard

**Files to Create:**
```
server/cron/monthly-feedback.ts
client/src/pages/feedback/SubmitFeedback.tsx
client/src/pages/affiliate/FeedbackDashboard.tsx
server/routers/feedback.ts (update)
supabase/migrations/009_feedback_automation.sql
```

### 2.4 WhatsApp Integration ⭐ MEDIUM
**Estimated Time:** 2 weeks
**Dependencies:** 1.4 Email Automation

**Features:**
- [ ] WhatsApp Business API integration
- [ ] WhatsApp notifications for:
  - [ ] New job matches
  - [ ] Application status updates
  - [ ] Interview reminders
  - [ ] Contract sent notifications
  - [ ] Payment reminders
  - [ ] Feedback requests
- [ ] Template message management
- [ ] Opt-in/opt-out handling
- [ ] Delivery status tracking
- [ ] WhatsApp vs Email preference per user

**Technical Stack:**
- Twilio WhatsApp API or Meta WhatsApp Business API
- Template message approval process

**Technical Tasks:**
- [ ] Set up WhatsApp Business account
- [ ] Create and approve message templates
- [ ] Build WhatsApp client wrapper
- [ ] Update notification preferences table
  ```sql
  ALTER TABLE users ADD COLUMN notification_preferences JSONB;
  -- { "email": true, "whatsapp": true, "sms": false }
  ```
- [ ] Implement WhatsApp sending logic
- [ ] Create delivery tracking
- [ ] Build notification preferences UI

**Files to Create:**
```
server/lib/whatsapp-client.ts
server/lib/notification-router.ts (chooses email vs whatsapp)
client/src/pages/settings/NotificationPreferences.tsx
supabase/migrations/010_whatsapp_logs.sql
```

---

## Phase 2 Success Criteria

**Automation is complete when:**
- [ ] Contracts can be digitally signed end-to-end
- [ ] Schools are automatically billed monthly
- [ ] Late payments trigger automated actions
- [ ] Monthly feedback is automatically collected
- [ ] WhatsApp notifications work alongside email

**Metrics to track:**
- Signature completion rate
- Average signature time
- Payment success rate
- Subscription churn rate
- Feedback response rate
- Notification delivery rate (WhatsApp vs Email)

---

## Phase 3: Advanced Features (8-12 weeks)

**Goal:** Add advanced features for sales, company capture, analytics, and compliance.

### 3.1 Sales Funnel & CRM ⭐⭐ HIGH
**Estimated Time:** 3 weeks

**Features:**
- [ ] Pipeline stages (lead, contacted, demo, proposal, negotiation, won, lost)
- [ ] Lead management (companies interested in hiring)
- [ ] Activity tracking (calls, emails, meetings)
- [ ] Meeting scheduling (Calendly-style)
- [ ] Automatic follow-up reminders
- [ ] Deal value tracking
- [ ] Conversion metrics
- [ ] Sales dashboard
- [ ] Lead assignment to affiliates

### 3.2 Company Capture Automation ⭐ MEDIUM
**Estimated Time:** 2 weeks

**Features:**
- [ ] Email campaign builder
- [ ] Cold email sequences
- [ ] Company database enrichment
- [ ] Web scraping (ethical, with consent)
- [ ] LinkedIn integration
- [ ] Contact import from CSV
- [ ] Email validation
- [ ] Bounce handling

### 3.3 Advanced Analytics ⭐ MEDIUM
**Estimated Time:** 2 weeks

**Features:**
- [ ] Executive dashboard (super admin)
- [ ] Affiliate performance metrics
- [ ] School engagement metrics
- [ ] Candidate funnel analysis
- [ ] Financial reporting
- [ ] Time-to-hire metrics
- [ ] Match quality metrics
- [ ] Revenue forecasting

### 3.4 Ministry of Labor Integration ⭐⭐ HIGH (Brazil only)
**Estimated Time:** 3 weeks

**Features:**
- [ ] eSocial integration
- [ ] Automatic data submission
- [ ] Compliance tracking
- [ ] CTPS digital integration
- [ ] Menor Aprendiz regulations
- [ ] Automatic compliance reports

### 3.5 Document Portal ⭐ MEDIUM
**Estimated Time:** 1 week

**Features:**
- [ ] Secure document storage
- [ ] Document templates library
- [ ] Version control
- [ ] Document expiration tracking
- [ ] Automatic reminders for expired docs

### 3.6 Advanced Search & Filters ⭐ MEDIUM
**Estimated Time:** 1 week

**Features:**
- [ ] Elasticsearch or similar
- [ ] Full-text candidate search
- [ ] Complex boolean filters
- [ ] Saved searches
- [ ] Search suggestions
- [ ] Fuzzy matching

---

## Phase 3 Success Criteria

**Platform is complete when:**
- [ ] Sales team can manage leads in CRM
- [ ] Analytics provide actionable insights
- [ ] Ministry of Labor compliance is automated
- [ ] Document management is centralized
- [ ] Search is fast and powerful

---

## Technical Infrastructure

### Required Services & Integrations

**Already Set Up:**
- [x] Supabase (database, auth, storage)
- [x] React 19 + TypeScript
- [x] tRPC (type-safe APIs)
- [x] Tailwind CSS + shadcn/ui

**To Add:**

**Phase 1:**
- [ ] AI Provider (OpenAI, Anthropic, or Gemini)
- [ ] Email Service (Resend or SendGrid)
- [ ] PDF Generation (Puppeteer or PDFKit)
- [ ] Cron Job System (node-cron or Supabase Edge Functions)

**Phase 2:**
- [ ] Digital Signature (DocuSign or HelloSign)
- [ ] Payment Gateway (Stripe)
- [ ] WhatsApp API (Twilio or Meta)

**Phase 3:**
- [ ] Calendar Integration (Google Calendar API)
- [ ] CRM System (custom or HubSpot integration)
- [ ] Analytics Platform (custom or Mixpanel/Amplitude)
- [ ] Search Engine (Elasticsearch or Typesense)
- [ ] Ministry of Labor APIs (eSocial, CTPS Digital)

### Cost Estimates (Monthly)

**Phase 1:**
- Supabase Pro: $25
- OpenAI API: $50-200 (depending on volume)
- Resend: $0-20 (free tier covers 3k emails/month)
- Total: ~$75-245/month

**Phase 2:**
- Add DocuSign: $10-40 (per envelope)
- Add Stripe: 2.9% + $0.30 per transaction
- Add Twilio WhatsApp: $0.005-0.01 per message
- Total: ~$100-300/month + transaction fees

**Phase 3:**
- Add analytics/CRM tools: $50-200
- Add Elasticsearch hosting: $50-200
- Total: ~$200-700/month

---

## Development Resources

### Team Requirements

**Minimum Viable Team:**
- 1 Full-stack Developer (React + Node.js + PostgreSQL)
- 1 Part-time Designer (UI/UX)
- 1 Part-time QA Tester

**Ideal Team:**
- 2 Full-stack Developers
- 1 Frontend Specialist (React)
- 1 Backend Specialist (Node.js + PostgreSQL)
- 1 UI/UX Designer
- 1 QA Engineer
- 1 Product Manager

### Time Estimates by Role

**Solo Developer:**
- Phase 1: 12-16 weeks
- Phase 2: 10-12 weeks
- Phase 3: 12-16 weeks
- **Total: 8-10 months**

**2 Developers:**
- Phase 1: 6-8 weeks
- Phase 2: 5-6 weeks
- Phase 3: 6-8 weeks
- **Total: 4-6 months**

**Full Team (4 developers):**
- Phase 1: 4-6 weeks
- Phase 2: 4-5 weeks
- Phase 3: 5-7 weeks
- **Total: 3-4.5 months**

---

## Risk Management

### Technical Risks

1. **AI Matching Quality**
   - Risk: AI matches might not be accurate
   - Mitigation: Start with rule-based matching, gradually introduce AI
   - Fallback: Allow manual override of AI suggestions

2. **Email Deliverability**
   - Risk: Emails might go to spam
   - Mitigation: Use reputable provider (Resend), implement SPF/DKIM/DMARC
   - Fallback: SMS or WhatsApp notifications

3. **Payment Processing Issues**
   - Risk: Payment failures, disputes, chargebacks
   - Mitigation: Use Stripe's built-in fraud detection
   - Fallback: Manual invoicing for high-value clients

4. **Digital Signature Compliance**
   - Risk: Signatures might not be legally binding
   - Mitigation: Use certified provider (DocuSign)
   - Fallback: Traditional paper signatures for critical contracts

### Business Risks

1. **Low Candidate Registration**
   - Mitigation: Marketing campaigns, referral bonuses
   - Metric: Track registration funnel

2. **Low School Adoption**
   - Mitigation: Free trial period, dedicated onboarding
   - Metric: Track activation rate

3. **High Churn Rate**
   - Mitigation: Customer success team, usage monitoring
   - Metric: Monthly churn rate

---

## Success Metrics

### Phase 1 KPIs
- Candidate registrations per week
- Test completion rate (>80%)
- Average match score (>70)
- Email open rate (>40%)
- Time to first match (<24 hours)

### Phase 2 KPIs
- Contract signature rate (>90%)
- Payment success rate (>95%)
- Feedback response rate (>60%)
- WhatsApp delivery rate (>98%)

### Phase 3 KPIs
- Lead conversion rate (>20%)
- Average time-to-hire (<14 days)
- Candidate placement rate (>50%)
- Customer satisfaction (NPS >50)

---

## Next Steps

### Immediate Actions (This Week)

1. **Run Database Migration**
   - Execute `002_franchise_v3.sql` in Supabase
   - Verify all tables and policies are created
   - Create super_admin user

2. **Set Up Development Environment**
   - Ensure all environment variables are set
   - Test local development workflow
   - Set up Git workflow (branches, PR process)

3. **Choose AI Provider**
   - Compare OpenAI vs Anthropic vs Gemini
   - Test API with sample matching scenarios
   - Estimate costs based on expected volume

4. **Set Up Email Service**
   - Create Resend account
   - Verify domain
   - Test sending emails

5. **Start Phase 1.1**
   - Begin candidate registration portal
   - Create database schema for tests
   - Design registration UI mockups

### This Month

- Complete Phase 1.1 and 1.2 (Candidate Registration + Testing)
- Start Phase 1.3 (AI Matching)
- Set up project management (Linear, Jira, or GitHub Projects)
- Document API endpoints
- Set up staging environment

### This Quarter

- Complete entire Phase 1 (MVP)
- Launch beta version
- Onboard 5-10 beta schools
- Gather feedback
- Iterate on core features

---

## Conclusion

This roadmap provides a clear path from current state (40% complete) to full specification compliance. The phased approach allows for:

1. **Quick wins** - MVP in 4-6 weeks
2. **Validated learning** - Test with real users before building advanced features
3. **Manageable scope** - Break down large project into achievable milestones
4. **Flexibility** - Adjust priorities based on user feedback

**Remember:** It's better to have a fully functional MVP than a partially built complete system. Focus on Phase 1, launch, learn, and iterate.
