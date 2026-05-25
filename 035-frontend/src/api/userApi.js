import api from "./axios";

export const allUserApi = async ({keyword}) => {
  const response = await api.post(
    "/rest/user/alluser",
    { "keyword" : keyword },
    { withCredentials: true }
  );

  return response.data.user;
};

export const modifyUserApi = async ({id, userId, userName, roles, email, use_yn}) => {
  const response = await api.post(
    "/rest/user/modifyuser",
    { 
      "id" : id,
      "userId" : userId,
      "userName" : userName,
      "roles" : roles, 
      "email" : email, 
      "use_yn" : use_yn
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const deleteUserApi = async ({seq}) => {
  const response = await api.post(
    "/rest/user/deleteuser",
    { 
      "id" : seq
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const addUserApi = async ({id, userId, password, userName, roles, email, use_yn}) => {
  const response = await api.post(
    "/rest/user/adduser",
    { 
      "id" : id,
      "userId" : userId,
      "password" : password,
      "userName" : userName,
      "roles" : roles,
      "email" : email,
      "use_yn" : use_yn
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};


export const updateProfileApi = async ({userId, password, email, user_nm, imgMyProfile, isImageDeleted}) => {
  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("password", password);
  formData.append("email", email);
  formData.append("user_nm", user_nm);
  formData.append("isImageDeleted", isImageDeleted);

  // 파일일 경우만 추가
  if (imgMyProfile) {
    formData.append("imgMyProfile", imgMyProfile);
  }

  const response = await api.post(
    "/rest/user/updateprofile",
    formData,
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const selectUserDataApi = async ({userId}) => {  
  
  const response = await api.post(
    "/rest/main/selectuserdata",
    { "userId" : userId },
    { withCredentials: true }
  );

  return response.data;
};

export const selectpfpdataApi = async ({userId}) => {  
  
  const response = await api.post(
    "/rest/user/selectpfpdata",
    { "userId" : userId },
    { withCredentials: true }
  );

  return response.data;
};