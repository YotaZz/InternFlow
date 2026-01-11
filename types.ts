// types.ts
export enum ProfileType {
  Base = 'Base',
  Master = 'Master',
}

export interface UserProfile {
  name: string;
  senderName?: string;
  undergrad: string;
  undergradMajor: string;

  master?: string;
  masterMajor?: string;
  masterYear?: string;
  currentGrade?: string;
  availability: string;
  frequency: string;
  arrival: string;
  aiModel: string;
  
  senderEmail: string; 
  smtpUser?: string;
  smtpPass?: string;

  bodyTemplate: string;
  filterCriteria: string;
}

export interface ParsingResult {
  company: string;
  department: string;
  position: string;
  email: string;
  profile_selected: string;
  email_subject: string;
  
  opening_line: string;
  job_source_line: string;
  praise_line: string;

  needs_review: boolean;
  review_reason?: string;
  pass_filter: boolean;
  filter_reason?: string;
}

export type JobStatus = 'pending' | 'filtered' | 'sent' | 'interview' | 'error';

export interface JobApplication {
  id: string; // UUID
  seq_id: number; // [新增] 序号
  user_id: string;
  company: string;
  department?: string;
  position: string;
  email: string;
  
  status: JobStatus;
  
  profile_selected: ProfileType;
  email_subject: string;
  opening_line: string;
  job_source_line: string;
  praise_line: string;

  needs_review?: boolean;
  review_reason?: string;
  pass_filter: boolean;
  filter_reason?: string;
  
  source: string;

  // 前端辅助字段
  selected?: boolean; 
  logs?: string[];
  filename?: string;
  created_at?: string;
}