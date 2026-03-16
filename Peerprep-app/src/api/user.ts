export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  experienceLevel: string | null;
  learningPurpose: string[];
  profilePicUrl: string | null;
  role: string;
};

export async function getCurrentUserProfile(): Promise<CurrentUser> {
  const response = await fetch(`http://localhost/api/user/profile/me`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "Failed to fetch current user profile");
  }

  return response.json();
}
