export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
    Tables: {
      users: {
        Row: {
          id: string
          role: 'admin' | 'agency' | 'candidate' | 'company' | null
          name: string | null
          email: string | null
          agency_id: string | null
          last_login: string | null
          profile_photo_url: string | null
          created_at: string
          updated_at: string | null
          last_signed_in: string | null
        }
        Insert: {
          id: string
          role?: 'super_admin' | 'admin' | 'agency' | 'candidate' | 'company' | null
          name?: string | null
          email?: string | null
          agency_id?: string | null
          last_login?: string | null
          profile_photo_url?: string | null
          created_at?: string
          updated_at?: string | null
          last_signed_in?: string | null
        }
        Update: {
          id?: string
          role?: 'super_admin' | 'admin' | 'agency' | 'candidate' | 'company' | null
          name?: string | null
          email?: string | null
          agency_id?: string | null
          last_login?: string | null
          profile_photo_url?: string | null
          created_at?: string
          updated_at?: string | null
          last_signed_in?: string | null
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string | null
          affiliate_id: string | null
          company_name: string
          cnpj: string | null
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          industry: string | null
          company_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website: string | null
          description: string | null
          logo: string | null
          notes: string | null
          contract_type: 'estagio' | 'clt' | 'menor-aprendiz' | null
          work_type: 'presencial' | 'remoto' | 'hibrido' | null
          location: string | null
          status: 'pending' | 'active' | 'suspended' | 'rejected'
          pipeline_status: 'new' | 'form_filled' | 'meeting_scheduled' | 'meeting_done' | 'contract_sent' | 'contract_signed' | 'lost' | null
          registration_token: string | null
          registration_token_expires_at: string | null
          contract_signature: string | null
          contract_signer_name: string | null
          contract_signer_cpf: string | null
          contract_signed_at: string | null
          summary: string | null
          summary_generated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          affiliate_id?: string | null
          company_name: string
          cnpj?: string | null
          email: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          industry?: string | null
          company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          description?: string | null
          logo?: string | null
          notes?: string | null
          contract_type?: 'estagio' | 'clt' | 'menor-aprendiz' | null
          work_type?: 'presencial' | 'remoto' | 'hibrido' | null
          location?: string | null
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          pipeline_status?: 'new' | 'form_filled' | 'meeting_scheduled' | 'meeting_done' | 'contract_sent' | 'contract_signed' | 'lost' | null
          registration_token?: string | null
          registration_token_expires_at?: string | null
          contract_signature?: string | null
          contract_signer_name?: string | null
          contract_signer_cpf?: string | null
          contract_signed_at?: string | null
          summary?: string | null
          summary_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          affiliate_id?: string | null
          company_name?: string
          cnpj?: string | null
          email?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          industry?: string | null
          company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          description?: string | null
          logo?: string | null
          notes?: string | null
          contract_type?: 'estagio' | 'clt' | 'menor-aprendiz' | null
          work_type?: 'presencial' | 'remoto' | 'hibrido' | null
          location?: string | null
          status?: 'pending' | 'active' | 'suspended' | 'rejected'
          pipeline_status?: 'new' | 'form_filled' | 'meeting_scheduled' | 'meeting_done' | 'contract_sent' | 'contract_signed' | 'lost' | null
          registration_token?: string | null
          registration_token_expires_at?: string | null
          contract_signature?: string | null
          contract_signer_name?: string | null
          contract_signer_cpf?: string | null
          contract_signed_at?: string | null
          summary?: string | null
          summary_generated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      affiliates: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_email: string
          contact_phone: string | null
          region: string | null
          commission_rate: number | null
          is_active: boolean
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_email: string
          contact_phone?: string | null
          region?: string | null
          commission_rate?: number | null
          is_active?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          contact_email?: string
          contact_phone?: string | null
          region?: string | null
          commission_rate?: number | null
          is_active?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      agencies: {
        Row: {
          id: string
          user_id: string
          affiliate_id: string | null
          created_by: string | null
          agency_name: string
          cnpj: string
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          industry: string | null
          agency_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website: string | null
          description: string | null
          logo: string | null
          status: 'pending' | 'active' | 'suspended'
          contract_pdf_url: string | null
          contract_pdf_key: string | null
          contract_html: string | null
          contract_type: 'pdf' | 'html' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agency_name: string
          cnpj: string
          email: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          industry?: string | null
          company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          description?: string | null
          logo?: string | null
          status?: 'pending' | 'active' | 'suspended'
          contract_pdf_url?: string | null
          contract_pdf_key?: string | null
          contract_html?: string | null
          contract_type?: 'pdf' | 'html' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          cnpj?: string
          email?: string
          phone?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          industry?: string | null
          company_size?: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website?: string | null
          description?: string | null
          logo?: string | null
          status?: 'pending' | 'active' | 'suspended'
          contract_pdf_url?: string | null
          contract_pdf_key?: string | null
          contract_html?: string | null
          contract_type?: 'pdf' | 'html' | null
          created_at?: string
          updated_at?: string
        }
      }
      candidates: {
        Row: {
          id: string
          user_id: string
          full_name: string
          cpf: string
          email: string
          phone: string | null
          date_of_birth: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          education_level: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | 'mestrado' | 'doutorado' | null
          currently_studying: boolean | null
          institution: string | null
          course: string | null
          skills: Json | null
          languages: Json | null
          experience: Json | null
          has_work_experience: boolean | null
          profile_summary: string | null
          resume_url: string | null
          photo_url: string | null
          general_knowledge_score: number | null
          language_test_results: Json | null
          technical_test_results: Json | null
          personality_profile: Json | null
          available_for_internship: boolean | null
          available_for_clt: boolean | null
          available_for_apprentice: boolean | null
          preferred_work_type: 'presencial' | 'remoto' | 'hibrido' | null
          status: 'active' | 'inactive' | 'employed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          cpf: string
          email: string
          phone?: string | null
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | 'mestrado' | 'doutorado' | null
          currently_studying?: boolean | null
          institution?: string | null
          course?: string | null
          skills?: Json | null
          languages?: Json | null
          experience?: Json | null
          has_work_experience?: boolean | null
          profile_summary?: string | null
          resume_url?: string | null
          photo_url?: string | null
          general_knowledge_score?: number | null
          language_test_results?: Json | null
          technical_test_results?: Json | null
          personality_profile?: Json | null
          available_for_internship?: boolean | null
          available_for_clt?: boolean | null
          available_for_apprentice?: boolean | null
          preferred_work_type?: 'presencial' | 'remoto' | 'hibrido' | null
          status?: 'active' | 'inactive' | 'employed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          cpf?: string
          email?: string
          phone?: string | null
          date_of_birth?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | 'mestrado' | 'doutorado' | null
          currently_studying?: boolean | null
          institution?: string | null
          course?: string | null
          skills?: Json | null
          languages?: Json | null
          experience?: Json | null
          has_work_experience?: boolean | null
          profile_summary?: string | null
          resume_url?: string | null
          photo_url?: string | null
          general_knowledge_score?: number | null
          language_test_results?: Json | null
          technical_test_results?: Json | null
          personality_profile?: Json | null
          available_for_internship?: boolean | null
          available_for_clt?: boolean | null
          available_for_apprentice?: boolean | null
          preferred_work_type?: 'presencial' | 'remoto' | 'hibrido' | null
          status?: 'active' | 'inactive' | 'employed'
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string
          contract_type: 'estagio' | 'clt' | 'menor-aprendiz'
          work_type: 'presencial' | 'remoto' | 'hibrido'
          location: string | null
          salary: number | null
          salary_max: number | null
          benefits: Json | null
          min_education_level: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills: Json | null
          required_languages: Json | null
          min_age: number | null
          max_age: number | null
          experience_required: boolean | null
          min_experience_years: number | null
          specific_requirements: string | null
          work_schedule: string | null
          status: 'draft' | 'open' | 'closed' | 'filled' | 'pending_review' | 'searching' | 'candidates_found' | 'in_selection' | 'paused'
          openings: number
          filled_positions: number
          published_at: string | null
          closed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description: string
          contract_type: 'estagio' | 'clt' | 'menor-aprendiz'
          work_type: 'presencial' | 'remoto' | 'hibrido'
          location?: string | null
          salary?: number | null
          salary_max?: number | null
          benefits?: Json | null
          min_education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills?: Json | null
          required_languages?: Json | null
          min_age?: number | null
          max_age?: number | null
          experience_required?: boolean | null
          min_experience_years?: number | null
          specific_requirements?: string | null
          work_schedule?: string | null
          status?: 'draft' | 'open' | 'closed' | 'filled' | 'pending_review' | 'searching' | 'candidates_found' | 'in_selection' | 'paused'
          openings?: number
          filled_positions?: number
          published_at?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string
          contract_type?: 'estagio' | 'clt' | 'menor-aprendiz'
          work_type?: 'presencial' | 'remoto' | 'hibrido'
          location?: string | null
          salary?: number | null
          salary_max?: number | null
          benefits?: Json | null
          min_education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills?: Json | null
          required_languages?: Json | null
          min_age?: number | null
          max_age?: number | null
          experience_required?: boolean | null
          min_experience_years?: number | null
          specific_requirements?: string | null
          work_schedule?: string | null
          status?: 'draft' | 'open' | 'closed' | 'filled' | 'pending_review' | 'searching' | 'candidates_found' | 'in_selection' | 'paused'
          openings?: number
          filled_positions?: number
          published_at?: string | null
          closed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      applications: {
        Row: {
          id: string
          job_id: string
          candidate_id: string
          status: 'applied' | 'screening' | 'interview-scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn'
          ai_match_score: number | null
          ai_match_reason: string | null
          company_notes: string | null
          rejection_reason: string | null
          applied_at: string
          reviewed_at: string | null
          interview_date: string | null
          decided_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          candidate_id: string
          status?: 'applied' | 'screening' | 'interview-scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn'
          ai_match_score?: number | null
          ai_match_reason?: string | null
          company_notes?: string | null
          rejection_reason?: string | null
          applied_at?: string
          reviewed_at?: string | null
          interview_date?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          candidate_id?: string
          status?: 'applied' | 'screening' | 'interview-scheduled' | 'interviewed' | 'selected' | 'rejected' | 'withdrawn'
          ai_match_score?: number | null
          ai_match_reason?: string | null
          company_notes?: string | null
          rejection_reason?: string | null
          applied_at?: string
          reviewed_at?: string | null
          interview_date?: string | null
          decided_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      contracts: {
        Row: {
          id: string
          company_id: string
          candidate_id: string
          job_id: string
          application_id: string
          contract_type: 'estagio' | 'clt' | 'menor-aprendiz'
          contract_number: string
          monthly_salary: number
          monthly_fee: number
          insurance_fee: number
          payment_day: number
          start_date: string
          end_date: string | null
          signed_at: string | null
          contract_document_url: string | null
          additional_documents: Json | null
          status: 'pending-signature' | 'active' | 'suspended' | 'terminated' | 'completed'
          termination_reason: string | null
          terminated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          candidate_id: string
          job_id: string
          application_id: string
          contract_type: 'estagio' | 'clt' | 'menor-aprendiz'
          contract_number: string
          monthly_salary: number
          monthly_fee: number
          insurance_fee?: number
          payment_day?: number
          start_date: string
          end_date?: string | null
          signed_at?: string | null
          contract_document_url?: string | null
          additional_documents?: Json | null
          status?: 'pending-signature' | 'active' | 'suspended' | 'terminated' | 'completed'
          termination_reason?: string | null
          terminated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          candidate_id?: string
          job_id?: string
          application_id?: string
          contract_type?: 'estagio' | 'clt' | 'menor-aprendiz'
          contract_number?: string
          monthly_salary?: number
          monthly_fee?: number
          insurance_fee?: number
          payment_day?: number
          start_date?: string
          end_date?: string | null
          signed_at?: string | null
          contract_document_url?: string | null
          additional_documents?: Json | null
          status?: 'pending-signature' | 'active' | 'suspended' | 'terminated' | 'completed'
          termination_reason?: string | null
          terminated_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          contract_id: string
          company_id: string
          candidate_id: string
          review_month: number
          review_year: number
          performance_rating: number | null
          punctuality_rating: number | null
          communication_rating: number | null
          teamwork_rating: number | null
          technical_skills_rating: number | null
          strengths: string | null
          areas_for_improvement: string | null
          general_comments: string | null
          recommend_continuation: boolean | null
          requires_replacement: boolean | null
          replacement_reason: string | null
          status: 'pending' | 'submitted' | 'reviewed'
          submitted_at: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          company_id: string
          candidate_id: string
          review_month: number
          review_year: number
          performance_rating?: number | null
          punctuality_rating?: number | null
          communication_rating?: number | null
          teamwork_rating?: number | null
          technical_skills_rating?: number | null
          strengths?: string | null
          areas_for_improvement?: string | null
          general_comments?: string | null
          recommend_continuation?: boolean | null
          requires_replacement?: boolean | null
          replacement_reason?: string | null
          status?: 'pending' | 'submitted' | 'reviewed'
          submitted_at?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          company_id?: string
          candidate_id?: string
          review_month?: number
          review_year?: number
          performance_rating?: number | null
          punctuality_rating?: number | null
          communication_rating?: number | null
          teamwork_rating?: number | null
          technical_skills_rating?: number | null
          strengths?: string | null
          areas_for_improvement?: string | null
          general_comments?: string | null
          recommend_continuation?: boolean | null
          requires_replacement?: boolean | null
          replacement_reason?: string | null
          status?: 'pending' | 'submitted' | 'reviewed'
          submitted_at?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          contract_id: string
          company_id: string
          amount: number
          payment_type: 'monthly-fee' | 'setup-fee' | 'insurance-fee' | 'penalty' | 'refund'
          payment_method: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date: string
          paid_at: string | null
          status: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id: string | null
          payment_gateway_response: Json | null
          notes: string | null
          receipt_url: string | null
          receipt_key: string | null
          receipt_status: 'pending-review' | 'verified' | 'rejected' | null
          receipt_uploaded_at: string | null
          receipt_verified_at: string | null
          receipt_verified_by: string | null
          ai_verification_result: Json | null
          billing_period: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          company_id: string
          amount: number
          payment_type: 'monthly-fee' | 'setup-fee' | 'insurance-fee' | 'penalty' | 'refund'
          payment_method?: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date: string
          paid_at?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_gateway_response?: Json | null
          notes?: string | null
          receipt_url?: string | null
          receipt_key?: string | null
          receipt_status?: 'pending-review' | 'verified' | 'rejected' | null
          receipt_uploaded_at?: string | null
          receipt_verified_at?: string | null
          receipt_verified_by?: string | null
          ai_verification_result?: Json | null
          billing_period?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          company_id?: string
          amount?: number
          payment_type?: 'monthly-fee' | 'setup-fee' | 'insurance-fee' | 'penalty' | 'refund'
          payment_method?: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date?: string
          paid_at?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_gateway_response?: Json | null
          notes?: string | null
          receipt_url?: string | null
          receipt_key?: string | null
          receipt_status?: 'pending-review' | 'verified' | 'rejected' | null
          receipt_uploaded_at?: string | null
          receipt_verified_at?: string | null
          receipt_verified_by?: string | null
          ai_verification_result?: Json | null
          billing_period?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          uploaded_by: string
          related_to_type: 'candidate' | 'company' | 'contract' | 'application'
          related_to_id: string
          document_type: string
          file_name: string
          file_url: string
          file_key: string
          file_size: number | null
          mime_type: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          uploaded_by: string
          related_to_type: 'candidate' | 'company' | 'contract' | 'application'
          related_to_id: string
          document_type: string
          file_name: string
          file_url: string
          file_key: string
          file_size?: number | null
          mime_type?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          uploaded_by?: string
          related_to_type?: 'candidate' | 'company' | 'contract' | 'application'
          related_to_id?: string
          document_type?: string
          file_name?: string
          file_url?: string
          file_key?: string
          file_size?: number | null
          mime_type?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'info' | 'success' | 'warning' | 'error'
          related_to_type: string | null
          related_to_id: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type?: 'info' | 'success' | 'warning' | 'error'
          related_to_type?: string | null
          related_to_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: 'info' | 'success' | 'warning' | 'error'
          related_to_type?: string | null
          related_to_id?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
      }
      admin_availability: {
        Row: {
          id: string
          admin_id: string
          agency_id: string | null
          day_of_week: number | null
          specific_date: string | null
          start_time: string
          end_time: string
          is_blocked: boolean
          label: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          agency_id?: string | null
          day_of_week?: number | null
          specific_date?: string | null
          start_time: string
          end_time: string
          is_blocked?: boolean
          label?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          agency_id?: string | null
          day_of_week?: number | null
          specific_date?: string | null
          start_time?: string
          end_time?: string
          is_blocked?: boolean
          label?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      scheduled_meetings: {
        Row: {
          id: string
          admin_id: string
          agency_id: string | null
          company_id: string | null
          company_email: string
          company_name: string | null
          contact_name: string | null
          contact_phone: string | null
          scheduled_at: string
          duration_minutes: number
          meeting_type: 'intro_call' | 'demo' | 'follow_up' | 'consultation'
          status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          confirmation_token: string
          notes: string | null
          cancelled_at: string | null
          cancelled_by: 'admin' | 'company' | null
          cancellation_reason: string | null
          reminder_sent: boolean
          reminder_sent_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          agency_id?: string | null
          company_id?: string | null
          company_email: string
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          scheduled_at: string
          duration_minutes?: number
          meeting_type?: 'intro_call' | 'demo' | 'follow_up' | 'consultation'
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          confirmation_token?: string
          notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: 'admin' | 'company' | null
          cancellation_reason?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          agency_id?: string | null
          company_id?: string | null
          company_email?: string
          company_name?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          scheduled_at?: string
          duration_minutes?: number
          meeting_type?: 'intro_call' | 'demo' | 'follow_up' | 'consultation'
          status?: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'
          confirmation_token?: string
          notes?: string | null
          cancelled_at?: string | null
          cancelled_by?: 'admin' | 'company' | null
          cancellation_reason?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_outreach: {
        Row: {
          id: string
          sender_id: string
          agency_id: string | null
          recipient_email: string
          company_id: string | null
          email_type: 'outreach' | 'meeting_invite' | 'reminder' | 'follow_up' | 'confirmation'
          subject: string | null
          body_preview: string | null
          status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          opened_at: string | null
          clicked_at: string | null
          error_message: string | null
          sent_at: string
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          agency_id?: string | null
          recipient_email: string
          company_id?: string | null
          email_type: 'outreach' | 'meeting_invite' | 'reminder' | 'follow_up' | 'confirmation'
          subject?: string | null
          body_preview?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          sent_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          agency_id?: string | null
          recipient_email?: string
          company_id?: string | null
          email_type?: 'outreach' | 'meeting_invite' | 'reminder' | 'follow_up' | 'confirmation'
          subject?: string | null
          body_preview?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
          opened_at?: string | null
          clicked_at?: string | null
          error_message?: string | null
          sent_at?: string
          created_at?: string
        }
      }
      admin_agency_context: {
        Row: {
          id: string
          admin_id: string
          agency_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          agency_id?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          agency_id?: string | null
          updated_at?: string
        }
      }
      job_presentations: {
        Row: {
          id: string
          job_id: string
          company_id: string
          scheduled_at: string | null
          completed_at: string | null
          candidates_presented: string[] | null
          candidates_selected: string[] | null
          status: 'pending_availability' | 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          company_id: string
          scheduled_at?: string | null
          completed_at?: string | null
          candidates_presented?: string[] | null
          candidates_selected?: string[] | null
          status?: 'pending_availability' | 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          company_id?: string
          scheduled_at?: string | null
          completed_at?: string | null
          candidates_presented?: string[] | null
          candidates_selected?: string[] | null
          status?: 'pending_availability' | 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      interview_feedback: {
        Row: {
          id: string
          application_id: string
          company_id: string
          candidate_id: string
          job_id: string
          interview_date: string
          candidate_attended: boolean
          decision: 'hire' | 'reject' | null
          rejection_reason: string | null
          notes: string | null
          submitted_at: string | null
          submitted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          application_id: string
          company_id: string
          candidate_id: string
          job_id: string
          interview_date: string
          candidate_attended?: boolean
          decision?: 'hire' | 'reject' | null
          rejection_reason?: string | null
          notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          application_id?: string
          company_id?: string
          candidate_id?: string
          job_id?: string
          interview_date?: string
          candidate_attended?: boolean
          decision?: 'hire' | 'reject' | null
          rejection_reason?: string | null
          notes?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      company_availability: {
        Row: {
          id: string
          company_id: string
          job_id: string | null
          availability_type: 'visit' | 'interview'
          date: string
          start_time: string
          end_time: string
          duration_minutes: number | null
          status: 'available' | 'booked' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          job_id?: string | null
          availability_type: 'visit' | 'interview'
          date: string
          start_time: string
          end_time: string
          duration_minutes?: number | null
          status?: 'available' | 'booked' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          job_id?: string | null
          availability_type?: 'visit' | 'interview'
          date?: string
          start_time?: string
          end_time?: string
          duration_minutes?: number | null
          status?: 'available' | 'booked' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_matches: {
        Row: {
          id: string
          job_id: string
          candidate_id: string
          affiliate_id: string
          match_score: number
          confidence_score: number | null
          match_explanation: string | null
          strengths: Json | null
          concerns: Json | null
          recommendation: string | null
          matching_version: string | null
          shown_to_candidate: boolean
          shown_to_candidate_at: string | null
          matched_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          candidate_id: string
          affiliate_id: string
          match_score: number
          confidence_score?: number | null
          match_explanation?: string | null
          strengths?: Json | null
          concerns?: Json | null
          recommendation?: string | null
          matching_version?: string | null
          shown_to_candidate?: boolean
          shown_to_candidate_at?: string | null
          matched_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          candidate_id?: string
          affiliate_id?: string
          match_score?: number
          confidence_score?: number | null
          match_explanation?: string | null
          strengths?: Json | null
          concerns?: Json | null
          recommendation?: string | null
          matching_version?: string | null
          shown_to_candidate?: boolean
          shown_to_candidate_at?: string | null
          matched_at?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
