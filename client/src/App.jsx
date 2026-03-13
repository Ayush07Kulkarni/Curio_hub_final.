import { Navigate, Route, Routes } from "react-router-dom";
import { useState } from "react";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import UserPage from "./pages/UserPage";
import ChatRoomPage from "./pages/ChatRoomPage";
import { getStoredUser } from "./lib/api";

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const homePath = user?.role === "ADMIN" ? "/admin" : "/user";

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={homePath} replace /> : <AuthPage onLogin={setUser} />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute user={user}>
            {user?.role === "ADMIN" ? (
              <AdminPage user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/user" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/user"
        element={
          <ProtectedRoute user={user}>
            {user?.role === "USER" ? (
              <UserPage user={user} onLogout={() => setUser(null)} />
            ) : (
              <Navigate to="/admin" replace />
            )}
          </ProtectedRoute>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <ProtectedRoute user={user}>
            <ChatRoomPage user={user} />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to={user ? homePath : "/auth"} replace />} />
      <Route path="*" element={<Navigate to={user ? homePath : "/auth"} replace />} />
    </Routes>
  );
}
