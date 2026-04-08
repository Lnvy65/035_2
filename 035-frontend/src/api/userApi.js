import api from "./axios";

export const allUserApi = async ({keyword}) => {
  const response = await api.post(
    "/rest/user/alluser",
    { "keyword" : keyword },
    { withCredentials: true }
  );

  return response.data.user;
};

export const oneUserApi = async ({id}) => {
  const response = await api.post(
    "/rest/user/oneuser",
    { "id" : id },
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const modifyUserApi = async ({id, username, kname, roles, email, address, use_yn}) => {
  const response = await api.post(
    "/rest/user/modifyuser",
    { 
      "id" : id,
      "username" : username,
      "kname" : kname, 
      "roles" : roles, 
      "email" : email, 
      "address" : address,
      "use_yn" : use_yn
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const deleteUserApi = async ({id}) => {
  const response = await api.post(
    "/rest/user/deleteuser",
    { 
      "id" : id
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};

export const addUserApi = async ({id, username, password, kname, roles, email, address, use_yn}) => {
  const response = await api.post(
    "/rest/user/adduser",
    { 
      "id" : id,
      "username" : username,
      "password" : password,
      "kname" : kname,
      "roles" : roles,
      "email" : email,
      "address" : address,
      "use_yn" : use_yn
    },
    {
      withCredentials: true,
    }
  );

  return response.data;
};


export const updateProfileApi = async ({user, password, buyingAmt, address, imgMyProfile}) => {
  const formData = new FormData();
  formData.append("user", user);
  formData.append("password", password);
  formData.append("buyingAmt", buyingAmt);
  formData.append("address", address);

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



