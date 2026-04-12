import { useMutation } from "@tanstack/react-query";
import { loginApi } from "../api/authApi";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

export const useLogin = () => {
  const loginStore = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: loginApi,
    onSuccess: (data) => {
      // 서버에서 받은 사용자 정보 저장
      loginStore(
        data.user, 
        data.accessToken
      );
      navigate("/");
    },
    onError: (error) => {
      // Axios 에러 객체에서 response 추출
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 403) {
        // 에러 코드가 403(Forbidden)인 경우
        alert("인증되지 않은 계정입니다. 관리자에게 연락하세요.");
      } else if (status === 401) {
        // 에러 코드가 401(Unauthorized)인 경우 (아이디/비번 틀림)
        alert(serverMessage || "아이디 또는 비밀번호를 확인해주세요.");
      } else {
        // 그 외 서버 에러 등
        alert("로그인 중 오류가 발생했습니다.");
      }

      console.error("Login Error Detail:", error);
    },
  });
};