
import { createSlice } from "@reduxjs/toolkit";

const getSavedUser = () => {
  try {
    const savedUser = localStorage.getItem("civicPulseUser");

    return savedUser ? JSON.parse(savedUser) : null;
  } catch {
    return null;
  }
};

const initialUser = getSavedUser();

const initialState = {
  user: initialUser,
  isAuthenticated: Boolean(initialUser?.id),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    loginSuccess: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = Boolean(action.payload?.id);
      state.loading = false;
      state.error = null;

      if (action.payload?.id) {
        localStorage.setItem(
          "civicPulseUser",
          JSON.stringify(action.payload)
        );

        localStorage.setItem(
          "civicPulseUserId",
          String(action.payload.id)
        );
      } else {
        state.user = null;
        state.isAuthenticated = false;

        localStorage.removeItem("civicPulseUser");
        localStorage.removeItem("civicPulseUserId");
        localStorage.removeItem("civicPulseTeamId");
      }
    },

    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;

      localStorage.removeItem("civicPulseUser");
      localStorage.removeItem("civicPulseUserId");
      localStorage.removeItem("civicPulseTeamId");
    },

    setAuthLoading: (state, action) => {
      state.loading = action.payload;
      state.error = null;
    },

    setAuthError: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    clearAuthError: (state) => {
      state.error = null;
    },
  },
});

export const {
  loginSuccess,
  logout,
  setAuthLoading,
  setAuthError,
  clearAuthError,
} = authSlice.actions;

export default authSlice.reducer;
