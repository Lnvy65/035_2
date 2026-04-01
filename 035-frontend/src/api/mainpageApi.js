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