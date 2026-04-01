import { NavLink } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useSidebarStore from "../store/sidebarStore";
import styles from "../styles/Sidebar.module.css";
import { Home, Users, Settings, Coffee, Menu, LogOut } from "lucide-react";
import { useLogout } from "../hooks/useLogout"; // 로그아웃 훅이 있다고 가정

const Sidebar = () => {
  const { user } = useAuthStore();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const logoutMutation = useLogout();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.collapsed}`}>
      {/* 상단 햄버거 버튼 영역 */}
      <div className={styles.sidebarHeader}>
        <button onClick={toggleSidebar} className={styles.burgerButton}>
          <Menu size={24} />
        </button>
        {isOpen && <span className={styles.projectTitle}>SubHub</span>}
      </div>

      {/* 메뉴 리스트 */}
      <ul className={styles.menu}>
        <li className={styles.menuItem}>
          <NavLink to="/" className={({ isActive }) => isActive ? styles.active : ""}>
            <Home size={22} />
            <span className={styles.menuText}>홈</span>
          </NavLink>
        </li>
        
        {user?.roles === "ADMIN" && (
          <li className={styles.menuItem}>
            <NavLink to="/manageUser" className={({ isActive }) => isActive ? styles.active : ""}>
              <Users size={22} />
              <span className={styles.menuText}>사용자 관리</span>
            </NavLink>
          </li>
        )}

        <li className={styles.menuItem}>
          <NavLink to="/profile" className={({ isActive }) => isActive ? styles.active : ""}>
            <Settings size={22} />
            <span className={styles.menuText}>설정</span>
          </NavLink>
        </li>
      </ul>
      
      {/* 하단 사용자 정보 및 로그아웃 */}
      <div className={styles.bottomArea}>
        <div className={styles.userInfo}>
          <Coffee size={20} />
          {isOpen && <span className={styles.menuText}>{user?.kname}님</span>}
        </div>
        <button onClick={() => logoutMutation.mutate()} className={styles.logoutBtn}>
          <LogOut size={20} />
          {isOpen && <span className={styles.menuText}>로그아웃</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;