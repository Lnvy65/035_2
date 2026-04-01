import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import { useNavigate } from "react-router-dom";
import styles from "../styles/LoginPage.module.css";

const LoginPage = () => {
  const [username, setUsername] = useState(null);
  const [password, setPassword] = useState(null);
  const loginMutation = useLogin();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };
  

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>로그인</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>아이디</label>
            <input
              className={styles.input}
              placeholder="사용자명"
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>비밀번호</label>
            <input
              type="password"
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
            type="button" // submit이 아닌 일반 button으로 변경 필수!
            className={styles.button}
            onClick={() => navigate("/signUp")} // 원하는 경로로 이동
          >
            회원가입
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
