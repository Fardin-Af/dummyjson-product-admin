import api from "./axios";

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

export const loginUser = async (
  username: string,
  password: string
): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>("/auth/login", {
    username,
    password,
  });

  return response.data;
};