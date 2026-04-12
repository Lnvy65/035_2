import React, { useState } from 'react';
import { useMutation } from "@tanstack/react-query";
import styles from '../styles/SignUpPage.module.css';
import { insertuserApi } from "../api/signupApi";
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const navigate = useNavigate();
  
  // 1. 초기 상태 키값을 서버/API 함수와 일치시킵니다.
  const [formData, setFormData] = useState({
    username: '', // userId 대신 username
    password: '',
    kname: '',    // nickname 대신 kname
    email: '',
  });

  const signupMutation = useMutation({
    mutationFn: insertuserApi,
    onSuccess: (data) => {
      // 닉네임 대신 kname 사용
      alert(`${formData.kname}님, 회원가입이 완료되었습니다!`);
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

  return (
    <div className={styles.container}>
      <button onClick={() => window.history.back()} className={styles.backButton}>
        ← 뒤로가기
      </button>
      
      <h1 className={styles.title}>회원가입</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label>아이디</label>
          <input 
            type="text" 
            name="username" // name을 username으로 수정
            value={formData.username} 
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
            name="kname" // name을 kname으로 수정
            value={formData.kname} 
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
  );
};

export default SignUpPage;