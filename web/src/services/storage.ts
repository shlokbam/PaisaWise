import { Preferences } from '@capacitor/preferences';

export async function setAuthToken(token: string, refreshToken?: string): Promise<void> {
  localStorage.setItem("access_token", token);
  if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

  try {
    await Preferences.set({ key: 'access_token', value: token });
    if (refreshToken) await Preferences.set({ key: 'refresh_token', value: refreshToken });
  } catch (err) {
    console.warn("Native preference set error:", err);
  }
}

export async function getAuthToken(): Promise<string | null> {
  let token = localStorage.getItem("access_token");
  if (token) return token;

  try {
    const { value } = await Preferences.get({ key: 'access_token' });
    if (value) {
      localStorage.setItem("access_token", value);
      return value;
    }
  } catch (err) {
    console.warn("Native preference get error:", err);
  }
  return null;
}

export async function clearAuthTokens(): Promise<void> {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  try {
    await Preferences.remove({ key: 'access_token' });
    await Preferences.remove({ key: 'refresh_token' });
  } catch (err) {
    console.warn("Native preference remove error:", err);
  }
}
