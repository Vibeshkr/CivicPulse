
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Resident pages
import Home from "./pages/user/Home";
import ExploreIssues from "./pages/user/ExploreIssues";
import IssueDetails from "./pages/user/IssueDetails";
import ReportIssue from "./pages/user/ReportIssue";
import Login from "./pages/user/Login";
import Register from "./pages/user/Register";
import UserDashboard from "./pages/user/UserDashboard";
import MyReports from "./pages/user/MyReports";
import MyNotifications from "./pages/user/MyNotifications";
import UserProfile from "./pages/user/UserProfile";
import IssueTracking from "./pages/user/IssueTracking";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import IssueVerification from "./pages/admin/IssueVerification";
import TeamManagement from "./pages/admin/TeamManagement";
import JobAssignment from "./pages/admin/JobAssignment";
import ResolutionVerification from "./pages/admin/ResolutionVerification";
import ExternalFollowUps from "./pages/admin/ExternalFollowUps";
import OrganizationManagement from "./pages/admin/OrganizationManagement";
import AdminProfile from "./pages/admin/AdminProfile";

// Maintenance pages
import MaintenanceDashboard from "./pages/maintenance/MaintenanceDashboard";
import MaintenanceJobDetails from "./pages/maintenance/MaintenanceJobDetails";
import MaintenanceHistory from "./pages/maintenance/MaintenanceHistory";
import MaintenanceProfile from "./pages/maintenance/MaintenanceProfile";
import MaintenancePriorityJobs from "./pages/maintenance/MaintenancePriorityJobs";

import "./App.css";

function NotFound() {
  return (
    <main className="not-found-page">
      <h1>404</h1>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist.</p>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<ExploreIssues />} />
        <Route path="/issues/:id" element={<IssueDetails />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Resident-only pages */}
        <Route element={<ProtectedRoute allowedRoles={["resident"]} />}>
          <Route path="/report" element={<ReportIssue />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/my-reports" element={<MyReports />} />
          <Route
            path="/my-notifications"
            element={<MyNotifications />}
          />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/track-issues" element={<IssueTracking />} />
        </Route>

        {/* Admin-only pages */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/issues" element={<IssueVerification />} />
          <Route path="/admin/teams" element={<TeamManagement />} />
          <Route path="/admin/assignments" element={<JobAssignment />} />
          <Route
            path="/admin/resolutions"
            element={<ResolutionVerification />}
          />
          <Route
            path="/admin/external-followups"
            element={<ExternalFollowUps />}
          />
          <Route
            path="/admin/organizations"
            element={<OrganizationManagement />}
          />
          <Route path="/admin/profile" element={<AdminProfile />} />
        </Route>

        {/* Maintenance-only pages */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={["maintenance", "maintenanceTeam"]}
            />
          }
        >
          <Route
            path="/maintenance"
            element={<MaintenanceDashboard />}
          />
          <Route
            path="/maintenance/jobs/:id"
            element={<MaintenanceJobDetails />}
          />
          <Route
            path="/maintenance/history"
            element={<MaintenanceHistory />}
          />
          <Route
            path="/maintenance/profile"
            element={<MaintenanceProfile />}
          />
        </Route>

        <Route
  path="/maintenance/priority-jobs"
  element={<MaintenancePriorityJobs />}
/>

        {/* Unknown routes */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
