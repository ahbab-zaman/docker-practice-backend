export interface RegisterBody {
  email: string;
  password: string;
  name: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  created_at: string;
}
