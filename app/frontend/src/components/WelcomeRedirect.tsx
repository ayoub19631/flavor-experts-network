import { Navigate, useLocation } from "react-router-dom";

export default function WelcomeRedirect() {
  const { hash, search } = useLocation();
  return <Navigate to={`/${hash}${search}`} replace />;
}
