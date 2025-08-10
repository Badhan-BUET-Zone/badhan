import { configureStore } from '@reduxjs/toolkit';
import authReducer, { persistAuth } from './slices/authSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
});

// simple persistence for auth slice
let lastAuthJson = '';
store.subscribe(() => {
  const state = store.getState();
  const curr = JSON.stringify(state.auth);
  if (curr !== lastAuthJson) {
    lastAuthJson = curr;
    persistAuth(state.auth);
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
