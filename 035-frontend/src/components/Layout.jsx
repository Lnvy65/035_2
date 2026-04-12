import React from "react";
import Sidebar from "./Sidebar";
import useSidebarStore from "../store/sidebarStore";
import styles from "../styles/AppLayout.module.css";

const Layout = ({ children }) => {
  const { isOpen } = useSidebarStore();

  return (
    <div className={styles.appContainer}>
      {/* 사이드바 고정 */}
      <Sidebar />
      
      {/* 본문 영역: 사이드바 너비만큼 margin-left를 동적으로 변경 */}
      <div 
        className={styles.contentArea}
        style={{ marginLeft: isOpen ? "280px" : "68px" }}
      >
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;