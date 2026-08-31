import { Navigate } from "react-router-dom";

/** Legacy catalog URL. Course rows remain in the database; public UI uses Industry Insights. */
export default function CoursesPage() {
  return <Navigate to="/insights" replace />;
}
