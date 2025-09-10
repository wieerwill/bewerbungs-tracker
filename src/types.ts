export type SalaryPeriod = 'year' | 'month';
export type WorkMode = 'onsite' | 'hybrid' | 'remote';
export type Seniority = 'intern' | 'junior' | 'mid' | 'senior' | 'lead';
export type EmploymentType = 'full-time' | 'part-time';
export type ContractType = 'permanent' | 'fixed-term' | 'freelance';

export interface Company {
  id: string;
  name: string;
  website?: string | null;
  street?: string | null;
  city?: string | null;
  note?: string | null; // Markdown
  linkedin_url?: string | null;
  glassdoor_url?: string | null;
  stepstone_url?: string | null;
  hiring_page?: string | null;
  other_links_json?: string | null; // JSON-String von [{label?:string,url:string}]
  industry?: string | null;
  size_range?: string | null;
  career_email?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  note?: string | null; // Markdown
  created_at?: string;
  updated_at?: string;
}

export interface JobRecord {
  id: string;
  title: string;
  description?: string | null; // Markdown
  note?: string | null; // Markdown
  status: JobStatus;
  company_id?: string | null;
  contact_id?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_target?: number | null;
  salary_currency?: string | null; // z. B. 'EUR'
  salary_period?: SalaryPeriod | null;
  work_mode?: WorkMode | null;
  remote_ratio?: number | null; // 0..100
  seniority?: Seniority | null;
  employment_type?: EmploymentType | null;
  contract_type?: ContractType | null;
  start_date?: string | null; // ISO (YYYY-MM-DD)
  deadline_date?: string | null; // ISO (YYYY-MM-DD)
  source_url?: string | null;
  application_channel?: string | null;
  referral?: 0 | 1;
  created_at?: string;
  updated_at?: string;
}

export interface JobJoinedRow extends JobRecord {
  company_name?: string | null;
  company_website?: string | null;
  company_city?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

export interface JobViewModel {
  _id: string;
  title: string;
  description: string;
  note: string;
  status: JobStatus;
  company_id: string | null;
  contact_id: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_target: number | null;
  salary_currency: string | null;
  salary_period: SalaryPeriod | null;
  work_mode: WorkMode | null;
  remote_ratio: number | null;
  seniority: Seniority | null;
  employment_type: EmploymentType | null;
  contract_type: ContractType | null;
  start_date: string | null;
  deadline_date: string | null;
  source_url: string | null;
  application_channel: string | null;
  referral: boolean;
  company: {
    name: string;
    website: string;
    city: string;
    street?: string;
    note?: string;
    linkedin_url?: string | null;
    glassdoor_url?: string | null;
    stepstone_url?: string | null;
    hiring_page?: string | null;
    industry?: string | null;
    size_range?: string | null;
    career_email?: string | null;
    phone?: string | null;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
    note?: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface ListJobsParams {
  query?: string;
  status?: '' | JobStatus;
  sort?: '' | 'title' | 'company';
}

export interface ListCompaniesParams {
  query?: string;
}

export type JobStatus =
  | 'discovered'
  | 'applied'
  | 'answered'
  | 'invited'
  | 'rejected'
  | 'offer';
