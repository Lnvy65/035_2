import api from "./axios";

export const eventListApi = async () => {
  const response = await api.post(
    "/rest/event/list",
    {},
    { withCredentials: true }
  );
  return response.data.result;
};

// 이미지 파일을 포함하여 전송
export const addEventApi = async ({ title, content, image }) => {
  const formData = new FormData();
  formData.append("title", title);
  formData.append("content", content);
  if (image) {
    formData.append("image", image);
  }

  const response = await api.post(
    "/rest/event/add",
    formData,
    { 
      withCredentials: true,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const deleteEventApi = async ({ seq }) => {
  const response = await api.post(
    "/rest/event/delete",
    { seq },
    { withCredentials: true }
  );
  return response.data;
};