import api from "./axios";

export const insertuserApi = async (userData) => { // 중괄호 제거
  const response = await api.post(
    "/rest/signup/signup", 
    userData, // 객체를 그대로 전송
    { withCredentials: true }
  );  
  return response.data;
};