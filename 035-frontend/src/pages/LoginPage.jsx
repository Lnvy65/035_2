import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import styles from "../styles/LoginPage.module.css";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // 마우스 좌표 및 카드 기울기 상태 관리
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rx: 0, ry: 0 });
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };
  
  const handleMouseMove = (e) => {
    // 1. 배경 움직임을 위한 좌표 계산
    const x = (window.innerWidth / 2 - e.clientX) * 0.03; 
    const y = (window.innerHeight / 2 - e.clientY) * 0.03;
    
    // [수정된 부분] 로그인 카드 3D 기울임을 위한 각도 배율을 매우 작게(0.005) 낮추어 눈이 아프지 않게 조정
    const rx = (window.innerHeight / 2 - e.clientY) * 0.005; 
    const ry = (window.innerWidth / 2 - e.clientX) * -0.005;
    // [수정된 부분] 끝

    setMousePos({ x, y, rx, ry });
  };

  // 마우스가 화면 밖으로 나가면 카드를 원래 위치로 복귀
  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0, rx: 0, ry: 0 });
  };

  return (
    <div 
      className={styles.container}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        '--mouse-x': `${mousePos.x}px`,
        '--mouse-y': `${mousePos.y}px`,
        '--rotate-x': `${mousePos.rx}deg`,
        '--rotate-y': `${mousePos.ry}deg`
      }}
    >
      <div className={styles.background} />

      <div className={styles.card}>
        <h1 className={styles.appTitle}>SubHub</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>아이디</label>
            <input
              className={styles.input}
              value={username}
              placeholder="사용자명"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>비밀번호</label>
            <input
              type="password"
              value={password}
              className={styles.input}
              placeholder="비밀번호"              
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className={styles.button}
          >
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button" 
            className={styles.button}
            onClick={() => navigate("/signUp")} 
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;