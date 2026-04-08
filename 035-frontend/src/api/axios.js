import axios from "axios";
import useAuthStore from "../store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

/* 요청 인터셉터 */
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = accessToken;
  }
  return config;
});

/* 응답 인터셉터 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const { login, logout } = useAuthStore.getState();

    // 1. 응답이 없거나 네트워크 에러인 경우 즉시 거절
    if (!error.response) return Promise.reject(error);

    // 2. 로그인/리프레시 API 호출 중 발생한 에러는 재시도 없이 즉시 밖으로 던짐 (무한루프 방지)
    if (originalRequest.url.includes("/login") || originalRequest.url.includes("/refresh")) {
      return Promise.reject(error);
    }

    // 3. 401 에러이고 재시도한 적이 없을 때만 리프레시 시도
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/rest/auth/refresh`,
          {},
          { withCredentials: true }
        );

        login(res.data.user, res.data.accessToken);
        originalRequest.headers.Authorization = res.data.accessToken;
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        // 리프레시 실패 시 로그인 페이지로 가거나 에러 던짐
        return Promise.reject(refreshError);
      }
    }

    // 4. 그 외의 에러(403 등)는 그대로 Reject 하여 useMutation의 onError로 전달
    return Promise.reject(error);
  }
);

export default api;