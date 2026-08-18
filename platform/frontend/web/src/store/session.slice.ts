import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// cr-in-memory-session — the signed-in user's session token, held only in
// this Redux store, never written to window.localStorage/sessionStorage
// (VC-CR-001). See scaffold/memory/DECISIONS.md ("cr-in-memory-session") for
// the full history: the login PRD's T07/T11 originally chose localStorage
// specifically *because* it survives a reload/new tab (AC10 as originally
// built); this CR reverses that per an explicit user request ("dont store in
// local storage, always go with login screen") — a reload or a new tab must
// no longer restore a previous session (AC2).
//
// This slice lives in the same store as ui.slice's sidebarOpen
// (store/index.ts), which store/provider.tsx creates fresh per
// `StoreProvider` instance — for this app, that's once per page
// load/hydration, since `StoreProvider` wraps the whole app at the root
// layout. That's exactly what makes this the right storage mechanism for
// the CR's two halves: AC1 (in-app client-side navigation keeps the same
// store instance, so the token survives it) and AC2 (a hard reload or a new
// tab re-executes this module from scratch, so there is nothing to
// rehydrate — the token is gone).
export interface SessionState {
  token: string | null;
}

const initialState: SessionState = { token: null };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSessionToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
    },
    // cr-logout-and-back-navigation, T01 (AC1) — a dedicated action rather
    // than widening setSessionToken's payload to `string | null`: every
    // existing call site of setSessionToken (storeSessionToken) always has a
    // real token in hand and should keep that guarantee in its own type
    // signature, not gain a null branch it never actually uses. Builder's
    // call per the task's own note on this being unbuilt-ahead-of-need; see
    // scaffold/memory/DECISIONS.md ("cr-logout-and-back-navigation (build)").
    clearSessionToken(state) {
      state.token = null;
    },
  },
});

export const { setSessionToken, clearSessionToken } = sessionSlice.actions;
export default sessionSlice.reducer;
