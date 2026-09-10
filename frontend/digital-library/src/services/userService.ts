// frontend/digital-library/src/services/userService.ts
import api from "@/services/api"
import type { User } from "@/types/user"

interface UpdateProfilePayload {
  full_name?: string
  username?: string
}

export const userService = {
  getMe: () => api.get<User>("/users/me").then((r) => r.data),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<User>("/users/me", payload).then((r) => r.data),

  updatePassword: async (data: { current_password: string; new_password: string }) => {
    const response = await api.patch("/users/me/password", data);
    return response.data;
    },
    searchUsers: (query: string) => 
    api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`).then((r) => r.data),
}
