export interface RegisterBody {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  email: string;
  created_at: string;
}
