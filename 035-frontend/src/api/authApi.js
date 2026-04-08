import api from "./axios";

export const loginApi = async ({ username, password }) => {
  const response = await api.post(
    "/rest/auth/login",
    { username, password, },
    { withCredentials: true }
  );  

  return response.data;
};

export const logoutApi = async () => {
  const response = await api.post(
    "/rest/auth/logout",
    {}, // 두 번째 인자는 Body입니다. 보낼 데이터가 없다면 빈 객체를 넣습니다.
    {
      withCredentials: true,
    }
  );

  return response.data;
};