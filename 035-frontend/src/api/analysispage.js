import api from "./axios";

export const selectsubchartdataApi = async ({userId}) => {  
  
  const response = await api.post(
    "/rest/main/selectsubchartdata",
    { "userId" : userId },
    { withCredentials: true }
  );

  return response.data;
};


export const selectcntcategorydataApi = async ({userId, selectedDate}) => {  
  
  const response = await api.post(
    "/rest/main/selectcntcategorydata",
    { "userId" : userId, "selectedDate": selectedDate },
    { withCredentials: true }
  );

  return response.data;
};


export const selectCategoryDetailApi = async ({userId, selectedDate, category}) => {  
  
  const response = await api.post(
    "/rest/main/selectCategoryDetail",
    { "userId" : userId, "selectedDate": selectedDate, "category": category },
    { withCredentials: true }
  );

  return response.data;
};


export const selectavgApi = async ({userId}) => {  
  
  const response = await api.post(
    "/rest/main/selectavg",
    { "userId" : userId },
    { withCredentials: true }
  );

  return response.data;
};