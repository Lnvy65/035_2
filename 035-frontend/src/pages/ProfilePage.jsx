import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import useAuthStore from "../store/authStore";
import { updateProfileApi, selectUserDataApi, selectpfpdataApi } from "../api/userApi";
import styles from "../styles/ProfilePage.module.css";
import { Lock, DollarSign, Settings, MapPin, Search, User, KeyRound, Mail, UserCheck, Trash2 } from "lucide-react";
import DaumPostcode from "react-daum-postcode";

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();

  const userId = user?.id;
  
  // 상태 관리
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소창 팝업 여부  
  const [imgMyProfile, setImgMyProfile] = useState(null); // 상단 useState 추가
  const [previewImg, setPreviewImg] = useState(null);  // 상단 useState 추가
  const [isImageDeleted, setIsImageDeleted] = useState(false); // 이미지 삭제 여부
  
  // 아이디, 이메일 상태 관리
  const [userInfo, setUserInfo] = useState({
    userId: user?.username || "",
    email: user?.email || "",
  });

  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  /* --------------------------------------------------------------------------------
    사진 조회
  -------------------------------------------------------------------------------- */
  const { data: pfpData = {}, isLoading: isPfpDataLoading, refetch: pfpDataRefetch, isFetching: isPfpDataFetching } = useQuery(
    {
      queryKey: ["selectpfp", userId],
      queryFn: () => selectpfpdataApi({ userId: userId }),
      enabled: !!userId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 0,
    }
  );
  const currentImageSrc = previewImg ? previewImg : (isImageDeleted ? null : pfpData?.userpfp?.[0]?.picture);
  

  /* --------------------------------------------------------------------------------
   사용자 정보 조회
  -------------------------------------------------------------------------------- */
  const { data: userData = [], isLoading: isUserDataLoading, error: userDataError, refetch: userDataRefetch, isFetching: isUserDataFetching } = useQuery(
    {    
      queryKey: ["selectUserData", userId],
      queryFn: () => selectUserDataApi({ userId : userId }),
      enabled: true,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    }
  );
  const dataresult = userData?.result?.[0] ?? {};


  // 파일 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 이미지 파일만 허용 (선택)
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }

    setImgMyProfile(file);
    setPreviewImg(URL.createObjectURL(file));
    setIsImageDeleted(false);
  };  


  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageDelete = () => {
    setImgMyProfile(null);
    setPreviewImg(null);
    setIsImageDeleted(true); // 이미지 삭제 플래그 활성화
  };

  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const saveSettings = () => {
    if (password.new !== password.confirm) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    // 수정된 API 파라미터 (주소 포함)
    updateProfileMutation.mutate({
      userId: userId,
      user: user.username,
      newUserId: userInfo.userId,
      email: userInfo.email,
      password: password.new,
      email: userInfo.email,
      user_nm: userInfo.user_nm,
      imgMyProfile: imgMyProfile,
      isImageDeleted: isImageDeleted,
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (data) => {
      updateUser({
        username: userInfo.userId,
        email: userInfo.email,
      });
      setPassword({ new: "", confirm: "" });
      setUserInfo({ email: "", user_nm: "" });
      setPreviewImg(null);
      setImgMyProfile(null); // 파일 선택 초기화
      setIsImageDeleted(false); // 이미지 삭제 플래그 초기화
      pfpDataRefetch(); // 저장이 완료되면 서버에서 새로운 이미지 정보를 다시 읽어오도록 리페치 실행
      alert("설정이 저장되었습니다.");
    },
    onError: (error) => {
      alert("저장에 실패했습니다.");
    },
  });

  // 버튼 활성화/비활성화 조건 정의
  const hasChanges =
    userInfo.email.trim() !== "" ||
    userInfo.user_nm.trim() !== "" ||
    password.new.trim() !== "" ||
    imgMyProfile !== null ||
    (isImageDeleted && !!pfpData?.userpfp?.[0]?.picture);

  // 비밀번호를 입력 중이라면, confirm과 일치해야만 통과
  const isPasswordInvalid = 
  password.new.trim() !== "" && password.new !== password.confirm;

  // 이메일을 입력 중이라면, 공백만 있는 경우는 통과 못함 (선택 사항: 원하시면 정규식 추가 가능)
  const isEmailInvalid = 
  userInfo.email !== "" && userInfo.email.trim() === "";

  // 닉네임을 입력 중이라면, 공백만 있는 경우는 통과 못함
  const isNicknameInvalid = 
  userInfo.user_nm !== "" && userInfo.user_nm.trim() === "";

  // 최종 버튼 비활성화 조건
  const isButtonDisabled =
  !hasChanges ||          // 변경사항이 아예 없거나
  isPasswordInvalid ||    // 비밀번호 입력 규칙이 틀렸거나
  isEmailInvalid ||       // 이메일이 공백만 있거나
  isNicknameInvalid ||    // 닉네임이 공백만 있거나
  updateProfileMutation.isPending; // 현재 저장 중인 경우

  const isDeleteBtnDisabled = !currentImageSrc;

  return (
    <div className={styles.container}>
      <h2 className={styles.header}><Settings size={22} /> 설정</h2>
      <p className={styles.welcomeText}>
        <strong>{user?.kname}({user?.username})</strong>님 정보를 수정합니다.
      </p>

      <hr className={styles.divider} />

      {/* 프로필 이미지 업로드 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <Settings size={20} /> 프로필 이미지
        </h3>

        <div className={styles.inputGroup}>
          {currentImageSrc && currentImageSrc !== "" ? (
            <img
              src={currentImageSrc}
              alt="프로필 이미지"
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "10px",
                border: "1px solid #ddd"
              }}
              // 혹시라도 이미지 로딩에 실패하면 콘솔에 에러를 찍어 확인하기 위함
              onError={(e) => console.error("이미지 로딩 실패 주소:", currentImageSrc)}
            />
          ) : (
            // 이미지가 아직 로딩 중이거나 없을 때 보여줄 기본 회색 동그라미 (선택 사항)
            <div style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              backgroundColor: "#eee",
              marginBottom: "10px",
              border: "1px solid #ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#aaa",
              fontSize: "12px"
            }}>
              이미지 없음
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className={styles.input}
          />

          <p className={styles.helperText}>
            * JPG, PNG 이미지 업로드 가능
          </p>

          {/* ★ 수정: 이미지 삭제 버튼 고도화 */}
            <button 
              onClick={handleImageDelete}
              disabled={isDeleteBtnDisabled}
              style={{
                padding: "6px 12px",
                backgroundColor: isDeleteBtnDisabled ? "#f5f5f5" : "#ff4d4f",
                color: isDeleteBtnDisabled ? "#ccc" : "#fff",
                border: "1px solid #ddd",
                borderRadius: "4px",
                cursor: isDeleteBtnDisabled ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "14px"
              }}
            >
              <Trash2 size={16} />
              이미지 삭제
            </button>
        </div>
      </section>

      {/* 아이디 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><User size={20} /> 아이디 수정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>아이디</label>
          <input
            type="text"
            name="user_nm"
            value={user.id}
            className={styles.input}
            disabled
          />
        </div>
      </section>

      {/* 기본 정보 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><User size={20} /> 기본 정보 수정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>아이디</label>
          <input
            type="text"
            name="userId"
            value=""
            onChange={handleUserInfoChange}
            className={styles.input}
            placeholder={"기존 아이디: "+userInfo.userId}
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>이메일</label>
          <input
            type="email"
            name="email"
            value={userInfo.email}
            onChange={handleUserInfoChange}
            className={styles.input}
            placeholder="변경할 이메일 입력"
          />
        </div>
      </section>

      {/* 비밀번호 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><KeyRound size={20} /> 암호 수정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>새 비밀번호</label>
          <input
            type="password"
            name="new"
            value={password.new}
            onChange={handlePasswordChange}
            className={styles.input}
            placeholder="새 비밀번호 입력"
          />
        </div>
        <div className={styles.inputGroup}>
          <label className={styles.label}>새 비밀번호 확인</label>
          <input
            type="password"
            name="confirm"
            value={password.confirm}
            onChange={handlePasswordChange}
            className={styles.input}
            placeholder="비밀번호 확인"
          />
        </div>
      </section>

      
      {/* 이메일 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Mail size={20} /> 이메일 수정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>이메일</label>
          <input
            type="email"
            name="email"
            value={userInfo.email}
            onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
            className={styles.input}
            placeholder={"기존 이메일 : " + user?.email}
          />
        </div>
      </section>

      {/* 닉네임 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><UserCheck size={20} /> 닉네임 수정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>닉네임</label>
          <input
            type="text"
            name="user_nm"
            value={userInfo.user_nm}
            onChange={(e) => setUserInfo({...userInfo, user_nm: e.target.value})}
            className={styles.input}
            placeholder={"기존 닉네임 : " + user?.username}
          />
        </div>
      </section>

      <button 
        onClick={saveSettings} 
        className={styles.saveButton}
        disabled={isButtonDisabled}
        style={{
          // 비활성화 상태일 때 시각적으로 보여주기 위한 예시 스타일 (선택사항)
          backgroundColor: isButtonDisabled ? "#ccc" : "#007bff",
          cursor: isButtonDisabled ? "not-allowed" : "pointer"
        }}
      >
        {updateProfileMutation.isPending ? "저장 중..." : "설정 저장하기"}
      </button>
    </div>
  );
};

export default ProfilePage;