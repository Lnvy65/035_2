import { NavLink } from "react-router-dom";
import useAuthStore from "../store/authStore";
import useSidebarStore from "../store/sidebarStore";
import styles from "../styles/Sidebar.module.css";
import useThemeStore from "../store/themeStore";
import { Home, Users, Settings, Coffee, Menu, LogOut, Moon, Sun, ChartColumnIncreasing, Gift } from "lucide-react"; // 수정됨: Gift 아이콘 임포트 추가
import { useLogout } from "../hooks/useLogout"; // 로그아웃 훅이 있다고 가정
import { selectpfpdataApi } from "../api/userApi";
import { useMutation, useQuery } from "@tanstack/react-query";

const Sidebar = () => {
  const { user } = useAuthStore();
  const { isOpen, toggleSidebar } = useSidebarStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  const logoutMutation = useLogout();
  const userId = user?.id;

  /* --------------------------------------------------------------------------------
    사진 조회
  -------------------------------------------------------------------------------- */
  const { data: pfpData = {}, isLoading: isPfpDataLoading, refetch: pfpDataRefetch, isFetching: isPfpDataFetching } = useQuery(
    {
      queryKey: ["selectpfp", userId],
      queryFn: () => selectpfpdataApi({ userId: userId }),
      enabled: !!userId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 0,
    }
  );
  const profileImgUrl = pfpData?.userpfp?.[0]?.picture;

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

        <li className={styles.menuItem}>
          <NavLink to="/analysis" className={({ isActive }) => isActive ? styles.active : ""}>
            <ChartColumnIncreasing size={22} />
            <span className={styles.menuText}>분석</span>
          </NavLink>
        </li>

        {/* 수정됨: 이벤트 페이지로 이동하는 메뉴 항목 추가 시작 */}
        <li className={styles.menuItem}>
          <NavLink to="/event" className={({ isActive }) => isActive ? styles.active : ""}>
            <Gift size={22} />
            <span className={styles.menuText}>이벤트</span>
          </NavLink>
        </li>
        {/* 수정됨: 이벤트 페이지로 이동하는 메뉴 항목 추가 끝 */}

        {/* 2. 설정(프로필) 메뉴 아이템 변경 부분 */}
        <li className={styles.menuItem}>
          <NavLink to="/profile" className={({ isActive }) => isActive ? styles.active : ""}>
            {profileImgUrl ? (
              // 이미지 주소가 존재할 때만 <img> 태그 노출
              <img
                src={profileImgUrl}
                alt="프로필 이미지"
                style={{
                  width: "33px", // 다른 아이콘들과 크기를 맞추기 위해 22px로 조절
                  height: "33px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  marginRight: "8px"
                }}
              />
            ) : (
              // 이미지 주소가 없을 때 기본 아이콘 노출 (여기서 Settings 대신 User를 써도 좋습니다)
              <Settings size={22} style={{ marginRight: "8px" }} />
            )}
            <span className={styles.menuText}>설정</span>
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
      </ul>
      
      {/* 하단 사용자 정보 및 로그아웃 */}
      <div className={styles.bottomArea}>

        <button onClick={toggleDarkMode} className={styles.themeToggleBtn}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          {isOpen && <span className={styles.menuText}>{isDarkMode ? '라이트 모드' : '다크 모드'}</span>}
        </button>

        <div className={styles.userInfo}>
          <Coffee size={20} />
          {isOpen && <span className={styles.menuText}>{user?.username}님</span>}
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