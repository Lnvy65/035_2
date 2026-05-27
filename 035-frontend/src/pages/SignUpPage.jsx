import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import styles from '../styles/SignUpPage.module.css';
import { insertuserApi } from "../api/signupApi";
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();
  
  // 1. 초기 상태 키값을 서버/API 함수와 일치시킵니다.
  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    userName: '',
    email: '',
  });

  // [추가된 부분] 로그인 페이지와 동일한 마우스 인터랙션 좌표 상태 추가
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, rx: 0, ry: 0 });

  const signupMutation = useMutation({
    mutationFn: insertuserApi,
    onSuccess: (data) => {
      // 닉네임 대신 userName 사용
      alert(`${formData.userName}님, 회원가입이 완료되었습니다!`);
      navigate("/login");
    },
    onError: (error) => {
      // 서버에서 res.status(400).json({ message: "중복 아이디" })로 보낼 경우
      const errorMessage = error.response?.data?.message || "이미 존재하는 아이디 입니다.";
      alert(errorMessage);
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signupMutation.mutate(formData);
  };

  // [추가된 부분] 배경 및 카드를 마우스 방향에 반응하도록 좌표 계산 핸들러 추가
  const handleMouseMove = (e) => {
    const x = (window.innerWidth / 2 - e.clientX) * 0.03; 
    const y = (window.innerHeight / 2 - e.clientY) * 0.03;
    const rx = (window.innerHeight / 2 - e.clientY) * 0.005; 
    const ry = (window.innerWidth / 2 - e.clientX) * -0.005;

    setMousePos({ x, y, rx, ry });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0, rx: 0, ry: 0 });
  };
  // [추가된 부분] 끝

  return (
    /* [수정된 부분] 마우스 추적 이벤트 바인딩 및 CSS 변수 전달 */
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
      {/* [추가된 부분] 로그인 페이지와 통일된 애니메이션 배경 레이어 */}
      <div className={styles.background} />

      <div className={styles.card}>
        <button onClick={() => window.history.back()} className={styles.backButton}>
          ← 뒤로가기
        </button>
        
        <h1 className={styles.title}>회원가입</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>아이디</label>
            <input 
              type="text" 
              name="userId"
              value={formData.userId} 
              onChange={handleChange} 
              placeholder="아이디를 입력하세요" required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>비밀번호</label>
            <input 
              type="password" name="password" value={formData.password} 
              onChange={handleChange} placeholder="비밀번호를 입력하세요" required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>닉네임</label>
            <input 
              type="text" 
              name="userName"
              value={formData.userName} 
              onChange={handleChange} 
              placeholder="닉네임을 입력하세요" required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>이메일</label>
            <input 
              type="email" name="email" value={formData.email} 
              onChange={handleChange} placeholder="example@email.com" required 
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitButton}
            disabled={signupMutation.isPending} // 로딩 중 버튼 비활성화
          >
            {signupMutation.isPending ? "처리 중..." : "가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;