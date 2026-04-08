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


// export const insertSubApi = async ({ userName, SERVICE_NM, MONTHLY_PRICE, ANCHOR_DAY, BILLING_CYCLE, CATEGORY }) => {
//   // 1. FormData 생성
//   const formData = new FormData();

//   // 2. 데이터 하나씩 추가
//   formData.append("USER_NM", userName);
//   formData.append("SERVICE_NM", SERVICE_NM);
//   formData.append("MONTHLY_PRICE", MONTHLY_PRICE);
//   formData.append("ANCHOR_DAY", ANCHOR_DAY);
//   formData.append("BILLING_CYCLE", BILLING_CYCLE);
//   formData.append("CATEGORY", CATEGORY);

//   const response = await api.post("/rest/main/insertsub", formData, {
//     headers: {
//       "Content-Type": "application/json", // JSON 형식 명시
//     }
//   });

//   return response.data;
// };

// api/mainpageApi.js 수정
export const insertSubApi = async (subData) => {
  // FormData를 생성하지 않고, 객체를 그대로 넘깁니다.
  // subData에는 { userName, SERVICE_NM, ... }가 포함되어 있어야 함
  const response = await api.post("/rest/main/insertsub", subData, {
    withCredentials: true,
  });

  return response.data;
};