import { useMutation } from "@tanstack/react-query";
import { logoutApi } from "../api/authApi";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";

export const useLogout = () => {
  const logoutStore = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: (data) => {
      // 서버에서 받은 사용자 정보 저장
      logoutStore();
      navigate("/login");
    },
    onError: (error) => {
      alert("로그아웃 실패");
      console.error(error);
    },
  });
};
