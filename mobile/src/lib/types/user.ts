export interface UserProfile {
  display_name: string;
  bio: string;
  avatar: string;
  date_of_birth: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  units: 'metric' | 'imperial';
  is_verified: boolean;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
}

export interface PublicUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  profile: UserProfile;
  followers_count: number;
  following_count: number;
  programs_count: number;
}