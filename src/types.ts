export interface Company {
  id: string;
  name: string;
  website?: string;
  street?: string;
  city?: string;
  note?: string;
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
