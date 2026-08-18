import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// App-wide UI state that isn't owned by any single feature module.
// Feature state belongs in that feature's own slice under
// src/modules/<feature>/store/ — not here.
export interface UiState {
  sidebarOpen: boolean;
}

const initialState: UiState = { sidebarOpen: false };

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, action: PayloadAction<boolean>) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
