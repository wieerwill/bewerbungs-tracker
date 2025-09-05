export interface Company {
  id: string;
  name: string;
  website?: string;
  street?: string;
  city?: string;
  note?: string;
  linkedin_url?: string;
  glassdoor_url?: string;
  stepstone_url?: string;
  other_links_json?: string; // JSON string
  industry?: string;
  size_range?: string;
  hiring_page?: string;
  career_email?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name?: string;
  email?: string;
  phone?: string;
  note?: string;
  created_at?: string;
  updated_at?: string;
}

export interface JobRecord {
  id: string;
  title: string;
  description?: string;
  note?: string;
  applied: 0 | 1;
  answer: 0 | 1;
  company_id?: string | null;
  contact_id?: string | null;

  salary_min?: number | null;
  salary_max?: number | null;
  salary_target?: number | null;
  salary_currency?: string | null; // e.g. 'EUR'
  salary_period?: 'year' | 'month' | null;

  work_mode?: 'onsite' | 'hybrid' | 'remote' | null;
  remote_ratio?: number | null;
  seniority?: 'intern' | 'junior' | 'mid' | 'senior' | 'lead' | null;
  employment_type?: 'full-time' | 'part-time' | null;
  contract_type?: 'permanent' | 'fixed-term' | 'freelance' | null;

  start_date?: string | null; // ISO-String (YYYY-MM-DD)
  deadline_date?: string | null;
  source_url?: string | null;
  application_channel?: string | null;
  referral?: 0 | 1;

  created_at?: string;
  updated_at?: string;
}

export interface JobJoinedRow extends JobRecord {
  company_name?: string;
  company_website?: string;
  company_city?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface JobViewModel {
  _id: string;
  title: string;
  description: string;
  note: string;
  applied: boolean;
  answer: boolean;
  company_id: string | null;
  contact_id: string | null;
  company: { name: string; website: string; city: string };
  contact: { name: string; email: string; phone: string };
  created_at?: string;
  updated_at?: string;
}

export interface ListJobsParams {
  query?: string;
  status?: '' | 'applied' | 'not-applied' | 'answered' | 'no-answer';
  sort?: '' | 'title' | 'company';
}
