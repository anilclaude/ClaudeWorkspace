import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { fetch__FeatureName__List } from '../api/__feature_name__.client';
import type { __FeatureName__Item } from '../schemas/__feature_name__.schema';

// Register this reducer in src/store/index.ts once copied — see that file's
// own comment for where.
export interface __FeatureName__State {
  items: __FeatureName__Item[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: __FeatureName__State = {
  items: [],
  status: 'idle',
  error: null,
};

export const load__FeatureName__ = createAsyncThunk('__feature_name__/load', () => {
  return fetch__FeatureName__List();
});

export const __featureName__Slice = createSlice({
  name: '__feature_name__',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(load__FeatureName__.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(
        load__FeatureName__.fulfilled,
        (state, action: PayloadAction<__FeatureName__Item[]>) => {
          state.status = 'succeeded';
          state.items = action.payload;
        },
      )
      .addCase(load__FeatureName__.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Failed to load';
      });
  },
});

export default __featureName__Slice.reducer;
