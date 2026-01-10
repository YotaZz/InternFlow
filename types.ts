export enum ProfileType {
  XMU_Only = 'XMU_Only',
  NUS_2027 = 'NUS_2027',
}

export interface JobApplication {
  id: string; // Unique ID for React keys
  company: string;
  department?: string; // New field
  position: string;
  email: string;
  profile_selected: ProfileType;
  email_subject: string;
  filename: string;
  email_body: string; // The AI generated body
  raw_requirement?: string; // For reference
  selected: boolean; // For batch operations
  status: 'pending' | 'sending' | 'sent' | 'error';
  logs: string[]; // SMTP sending logs
}

export interface UserProfile {
  name: string;
  undergrad: string; // e.g. Xiamen University
  master?: string; // e.g. NUS
  masterMajor?: string; // e.g. Computer Science
  masterYear?: string; // e.g. 2027
  currentGrade?: string; // e.g. 研一
  availability: string; // e.g. 6 months
  frequency: string; // e.g. 5 days/week
  arrival: string; // e.g. One week notice
  bodyTemplate: string; // The text template for the email body
  aiModel: string; // The selected Gemini model
  
  // SMTP Config
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
}

export interface ParsingResult {
  company: string;
  department: string; // New field
  position: string;
  email: string;
  profile_selected: string;
  email_subject: string;
  filename: string;
  email_body: string;
}
