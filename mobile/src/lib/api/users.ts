// mobile/src/lib/api/users.ts
import { request } from './auth';
import { PublicUser } from '../types/user';
import { Program } from '../types/program';

export const usersApi = {
  // Fetch public profile by username
  getUser: (username: string, token: string) => 
    request<PublicUser>(`/accounts/users/${username}/`, {
      method: 'GET',
    }, token), // <--- Pass token here
    
  // Fetch programs for a specific user
  // If it's the current user, we want ALL programs (Private + Public)
  // If it's another user, we likely want ONLY Public programs (requires backend support, see Step 3)
  getUserPrograms: (username: string, isMe: boolean, token: string) => {
    // If it's me, use the standard My Programs endpoint
    if (isMe) {
        return request<Program[]>(`/core/programs/`, {
            method: 'GET',
        }, token);
    }
    
    // If it's someone else, use the public filter (Note: We need to ensure the Backend supports this)
    return request<Program[]>(`/core/programs/public/?username=${username}`, {
        method: 'GET',
    }, token);
  }
};