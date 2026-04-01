import { create } from "zustand";

const useAuthStore = create((set) => (
        {
          user: null,
          isAuthenticated: false,
          accessToken: null,
          isLoading: true,

          login: (userData, accessTokenData) =>
            // set함수는 zustand에서 특정stat을 변경할때 사용
            set(  
              {
                user: userData,
                accessToken: accessTokenData,
                isAuthenticated: true,
                isLoading: false,
              }
            ),

          logout: () =>
            set(
              {
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false,
              }
            ),

          finishLoading: () =>
            set(
              { 
                isLoading: false
              }
            ),          
          updateUser: (newData) => 
            set(
              (state) => (
                {
                  user: { ...state.user, ...newData }
                }
              )
            ),            
        }

      )
);

export default useAuthStore;
