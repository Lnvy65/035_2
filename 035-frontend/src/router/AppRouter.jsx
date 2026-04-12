import { Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import LoginPage from "../pages/LoginPage";
import MainPage from "../pages/MainPage";
import ManageUserPage from "../pages/ManageUserPage";
import ProfilePage from "../pages/ProfilePage";
import SignUpPage from "../pages/SignUpPage";
import Layout from "../components/Layout";

const AppRouter = () => {  
  const { user, isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={isAuthenticated ? <Navigate to="/" /> : <SignUpPage />}
      />
      
      {/* 인증이 필요한 모든 페이지는 Layout으로 감쌉니다 */}
      <Route
        path="/"
        element={isAuthenticated ? <Layout><MainPage /></Layout> : <Navigate to="/login" />}
      />
      <Route
        path="/profile"
        element={isAuthenticated ? <Layout><ProfilePage /></Layout> : <Navigate to="/login" />}
      />                  
      <Route
        path="/manageUser"
        element={user?.roles === "ADMIN" ? <Layout><ManageUserPage /></Layout> : <Navigate to="/login" />}
      />        
    </Routes>
  );
};

export default AppRouter;