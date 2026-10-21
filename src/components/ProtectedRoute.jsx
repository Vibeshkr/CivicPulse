
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const DASHBOARD_PATHS = {
  resident: "/dashboard",
  admin: "/admin",
  maintenance: "/maintenance",
  maintenanceTeam: "/maintenance",
};

function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const location = useLocation();

  const hasValidSession =
    isAuthenticated &&
    Boolean(user?.id) &&
    Boolean(DASHBOARD_PATHS[user?.role]);

  // Redirect users without a valid local session.
  if (!hasValidSession) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Prevent access to pages for other roles.
  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate
        to={DASHBOARD_PATHS[user.role]}
        replace
      />
    );
  }

  return <Outlet />;
}

export default ProtectedRoute;
