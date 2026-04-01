import { useEffect } from "react";
import api from "./api/axios";
import useAuthStore from "./store/authStore";
import Sidebar from "./components/Sidebar";
import AppRouter from "./router/AppRouter";
import styles from "./styles/AppLayout.module.css";
import useSidebarStore from "./store/sidebarStore";

function App() {
  const { isAuthenticated, isLoading, login, finishLoading } = useAuthStore();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebarStore();

  useEffect(() => {
    const restoreLogin = async () => {
      try {
        const res = await api.post(
          "/rest/auth/refresh",
          {},                        // Body파라메타
          { withCredentials: true }  // Header파라메타
        );

        login(
            res.data.user,
            res.data.accessToken
        );
      } catch {
        // 로그인 안 된 상태
        finishLoading(); // 로그인 실패여도 로딩 종료
      }
    };

    restoreLogin();
  }, [login, finishLoading]);


if (isLoading) {
  return <div>로딩 중...</div>;
}


return (
    <div className={styles.layout}>
      <div className={styles.body}>
        {isAuthenticated && (
          <Sidebar />
        )}

        <main className={styles.main}>
          <AppRouter />
        </main>

      </div>
    </div>
  );






}

export default App;
