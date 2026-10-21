
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getIssues } from "../../services/civicPulseService";

export const fetchIssues = createAsyncThunk(
  "issues/fetchIssues",
  async (_, { rejectWithValue }) => {
    try {
      const issues = await getIssues();

      if (!Array.isArray(issues)) {
        return rejectWithValue(
          "Invalid response received while loading civic issues."
        );
      }

      return issues;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          error.message ||
          "Failed to load civic issues."
      );
    }
  }
);

const issuesSlice = createSlice({
  name: "issues",

  initialState: {
    items: [],
    loading: false,
    error: null,
  },

  reducers: {
    clearIssueError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchIssues.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIssues.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchIssues.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Unable to load issues.";
      });
  },
});

export const { clearIssueError } = issuesSlice.actions;

export default issuesSlice.reducer;
