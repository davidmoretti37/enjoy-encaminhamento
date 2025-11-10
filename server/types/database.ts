export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          role: 'super_admin' | 'affiliate' | 'school' | 'candidate'
          name: string | null
          email: string | null
          created_at: string
          updated_at: string
          last_signed_in: string
        }
        Insert: {
          id: string
          role?: 'super_admin' | 'affiliate' | 'school' | 'candidate'
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          last_signed_in?: string
        }
        Update: {
          id?: string
          role?: 'super_admin' | 'affiliate' | 'school' | 'candidate'
          name?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
          last_signed_in?: string
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
      schools: {
        Row: {
          id: string
          user_id: string
          affiliate_id: string | null
          created_by: string | null
          school_name: string
          cnpj: string
          email: string
          phone: string | null
          address: string | null
          city: string | null
          state: string | null
          zip_code: string | null
          industry: string | null
          school_size: '1-10' | '11-50' | '51-200' | '201-500' | '500+' | null
          website: string | null
          description: string | null
          logo: string | null
          status: 'pending' | 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          school_name: string
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
          benefits: Json | null
          min_education_level: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills: Json | null
          required_languages: Json | null
          min_age: number | null
          max_age: number | null
          experience_required: boolean | null
          min_experience_years: number | null
          specific_requirements: string | null
          status: 'draft' | 'open' | 'closed' | 'filled'
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
          benefits?: Json | null
          min_education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills?: Json | null
          required_languages?: Json | null
          min_age?: number | null
          max_age?: number | null
          experience_required?: boolean | null
          min_experience_years?: number | null
          specific_requirements?: string | null
          status?: 'draft' | 'open' | 'closed' | 'filled'
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
          benefits?: Json | null
          min_education_level?: 'fundamental' | 'medio' | 'superior' | 'pos-graduacao' | null
          required_skills?: Json | null
          required_languages?: Json | null
          min_age?: number | null
          max_age?: number | null
          experience_required?: boolean | null
          min_experience_years?: number | null
          specific_requirements?: string | null
          status?: 'draft' | 'open' | 'closed' | 'filled'
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
          payment_type: 'monthly-fee' | 'setup-fee' | 'penalty' | 'refund'
          payment_method: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date: string
          paid_at: string | null
          status: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id: string | null
          payment_gateway_response: Json | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contract_id: string
          company_id: string
          amount: number
          payment_type: 'monthly-fee' | 'setup-fee' | 'penalty' | 'refund'
          payment_method?: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date: string
          paid_at?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_gateway_response?: Json | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contract_id?: string
          company_id?: string
          amount?: number
          payment_type?: 'monthly-fee' | 'setup-fee' | 'penalty' | 'refund'
          payment_method?: 'credit-card' | 'debit-card' | 'bank-transfer' | 'pix' | null
          due_date?: string
          paid_at?: string | null
          status?: 'pending' | 'paid' | 'overdue' | 'failed' | 'refunded'
          transaction_id?: string | null
          payment_gateway_response?: Json | null
          notes?: string | null
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
    }
  }
}
