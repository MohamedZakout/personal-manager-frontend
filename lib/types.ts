export type UserRole = "admin" | "user";

export type SelectOption = { value: string; label: string };

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  role_label: string;
  created_at: string;
  updated_at: string;
  projects_count?: number;
  accounts_count?: number;
  commands_count?: number;
  can_delete?: boolean;
  can_change_role?: boolean;
};

export type LoginResponse = User & {
  token: string;
  token_type: "Bearer";
  expires_in: number;
};

export type Category = {
  id: number;
  name: string;
  color: string;
  created_at: string;
  accounts_count?: number;
  projects_count?: number;
};

export type CommandStep = { type: "instruction" | "command"; value: string };

export type CommandVariable = {
  name: string;
  default: string | null;
  description: string | null;
};

export type Command = {
  id: number;
  name: string;
  steps: CommandStep[];
  description: string | null;
  tags: string[];
  variables: CommandVariable[];
  folder_id: number | null;
  project_id: number | null;
  account_id: number | null;
  created_at: string;
  updated_at: string;
};

export type CommandFolder = {
  id: number;
  name: string;
  created_at: string;
};

export type CommandLibrary = {
  folders: CommandFolder[];
  commands: Command[];
};

export type CredentialField = { key: string; value: string | null };

export type Credential = {
  id: number;
  title: string;
  instructions: string | null;
  fields: CredentialField[];
  created_at: string;
  updated_at: string;
};

export type FileRecord = {
  id: number;
  original_name: string;
  title: string | null;
  description: string | null;
  mime_type: string | null;
  size: number | null;
  created_at: string;
  download_url: string;
};

export type Project = {
  id: number;
  slug: string;
  name: string;
  position: number;
  category_id: number | null;
  category?: Category | null;
  description: string | null;
  created_at: string;
  updated_at: string;
  credentials_count?: number;
  files_count?: number;
  commands_count?: number;
  credentials?: Credential[];
  files?: FileRecord[];
  commands?: Command[];
};

export type AccountProvider =
  | "apple_developer"
  | "google_developer"
  | "aws"
  | "azure"
  | "cloudflare"
  | "digital_ocean"
  | "firebase"
  | "github"
  | "gitlab"
  | "stripe"
  | "vercel"
  | "other";

export type Account = {
  id: number;
  provider: AccountProvider;
  provider_label: string;
  name: string;
  position: number;
  category_id: number | null;
  category?: Category | null;
  external_id: string | null;
  description: string | null;
  instructions: string | null;
  created_at: string;
  updated_at: string;
  credentials_count?: number;
  files_count?: number;
  commands_count?: number;
  credentials?: Credential[];
  files?: FileRecord[];
  commands?: Command[];
};

export type DashboardSummary = {
  stats: { projects: number; accounts: number };
  recent_projects: Project[];
  recent_accounts: Account[];
};

export type Meta = {
  account_providers: SelectOption[];
  user_roles: SelectOption[];
};

export type ApiErrorShape = {
  message?: string;
  errors?: Record<string, string[] | string>;
};
