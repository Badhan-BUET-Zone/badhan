import { createSlice } from '@reduxjs/toolkit';

type UIState = {
  drawerOpen: boolean;
};

const initialState: UIState = {
  drawerOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openDrawer: (s) => { s.drawerOpen = true; },
    closeDrawer: (s) => { s.drawerOpen = false; },
    toggleDrawer: (s) => { s.drawerOpen = !s.drawerOpen; },
  },
});

export const { openDrawer, closeDrawer, toggleDrawer } = uiSlice.actions;
export default uiSlice.reducer;
