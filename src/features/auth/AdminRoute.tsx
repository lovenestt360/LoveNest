import { Navigate, Outlet } from "react-router-dom";

export function AdminRoute() {
    // Basic frontend check. Real API calls will still fail if RLS was strict,
    // but here we just block the UI if the token is missing.
    const token = localStorage.getItem("lovenest_admin_token");

    if (!token) {
        return <Navigate to="/admin-login" replace />;
    }

    return <Outlet />;
}
