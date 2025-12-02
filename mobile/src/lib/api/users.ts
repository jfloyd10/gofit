// mobile/src/lib/api/users.ts
import { request } from './auth';
import { PublicUser } from '../types/user';
import { Program } from '../types/program';

export const usersApi = {
  // Fetch public profile by username
  getUser: (username: string, token: string) => 
    request<PublicUser>(`/accounts/users/${username}/`, {
      method: 'GET',
    }, token),
    
  // Fetch programs for a specific user
  // Updated to handle Django Pagination (response.results)
  getUserPrograms: async (username: string, isMe: boolean, token: string) => {
    let endpoint;

    // If it's me, use the standard My Programs endpoint
    if (isMe) {
        endpoint = `/core/programs/`;
    } else {
        // If it's someone else, use the public filter
        endpoint = `/core/programs/public/?username=${username}`;
    }

    const response = await request<any>(endpoint, {
        method: 'GET',
    }, token);

    // Check if the response is paginated (has a 'results' array)
    if (response && Array.isArray(response.results)) {
        return response.results as Program[];
    }

    // Fallback: If the API was changed to return a flat array
    if (Array.isArray(response)) {
        return response as Program[];
    }

    // Default to empty array if format is unexpected
    return [];
  }
};