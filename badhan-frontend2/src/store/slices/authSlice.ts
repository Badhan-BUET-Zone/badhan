import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit'; // ⬅ type-only import

export type AuthState = {
  isSignedIn: boolean;
  phone?: string;
};

const AUTH_KEY = 'badhan-auth';
const readAuth = (): AuthState => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : { isSignedIn: false };
  } catch {
    return { isSignedIn: false };
  }
};

const initialState: AuthState = readAuth();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signIn: (state, action: PayloadAction<{ phone: string }>) => {
      state.isSignedIn = true;
      state.phone = action.payload.phone;
    },
    signOut: (state) => {
      state.isSignedIn = false;
      state.phone = undefined;
    },
  },
});

export const { signIn, signOut } = authSlice.actions;
export default authSlice.reducer;

export const persistAuth = (state: AuthState) => {
  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  } catch {}
};
