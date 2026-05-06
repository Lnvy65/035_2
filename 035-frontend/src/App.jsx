import './index.css';
import { useEffect, useMemo } from "react";
import api from "./api/axios";
import useAuthStore from "./store/authStore";
import Sidebar from "./components/Sidebar";
import AppRouter from "./router/AppRouter";
import styles from "./styles/AppLayout.module.css";
import useSidebarStore from "./store/sidebarStore";
import useThemeStore from "./store/themeStore";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";



function App() {
  const { isAuthenticated, isLoading, login, finishLoading } = useAuthStore();
  const { isOpen, toggleSidebar, closeSidebar } = useSidebarStore();
  

  const isDarkMode = useThemeStore((state) => state.isDarkMode);


  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
        },
      }),
    [isDarkMode]
  );

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
  <ThemeProvider theme={theme}>
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
  </ThemeProvider>
  );






}

export default App;
