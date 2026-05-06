import api from "./axios";

export const selectsumApi = async ({userName}) => {  
  
  const response = await api.post(
    "/rest/main/selectsum",
    { "userName" : userName },
    { withCredentials: true }
  );

  return response.data;
};


export const selectdateApi = async ({userName}) => {  
  
  const response = await api.post(
    "/rest/main/selectdate",
    { "userName" : userName },
    { withCredentials: true }
  );

  return response.data;
};


export const selectsublistApi = async ({userName}) => {  
  
  const response = await api.post(
    "/rest/main/selectsublist",
    { "userName" : userName },
    { withCredentials: true }
  );

  return response.data.result;
};


export const deleteSubApi = async ({ seq }) => {

  const response = await api.post(
    "/rest/main/deletesub",
    { "seq": seq }, // 객체 키값이 백엔드의 req.body.seq와 일치해야 함
    { withCredentials: true }
  );

  return response.data;
};


export const selectsubchartApi = async ({userName}) => {  
  
  const response = await api.post(
    "/rest/main/selectsubchart",
    { "userName" : userName },
    { withCredentials: true }
  );

  return response.data;
};

// api/mainpageApi.js 수정
export const insertSubApi = async (subData) => {
  // FormData를 생성하지 않고, 객체를 그대로 넘깁니다.
  // subData에는 { userName, SERVICE_NM, ... }가 포함되어 있어야 함
  const response = await api.post("/rest/main/insertsub", subData, {
    withCredentials: true,
  });

  return response.data;
};

// api/mainpageApi.js 수정
export const updateSubApi = async (subData) => {
  // FormData를 생성하지 않고, 객체를 그대로 넘깁니다.
  // updatesub에는 { userName, SERVICE_NM, ... }가 포함되어 있어야 함
  const response = await api.post("/rest/main/updatesub", subData, {
    withCredentials: true,
  });

  return response.data;
};