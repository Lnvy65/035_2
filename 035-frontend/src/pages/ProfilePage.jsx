import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import useAuthStore from "../store/authStore";
import { updateProfileApi } from "../api/userApi";
import { selectcurnmApi } from "../api/mainpageApi";
import styles from "../styles/ProfilePage.module.css";
import { Lock, DollarSign, Settings, MapPin, Search } from "lucide-react";
import DaumPostcode from "react-daum-postcode";
import { TextField, MenuItem } from "@mui/material";

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  
  // 상태 관리
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소창 팝업 여부  
  const [imgMyProfile, setImgMyProfile] = useState(null); // 상단 useState 추가
  const [previewImg, setPreviewImg] = useState(null);  // 상단 useState 추가 
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [prefCurrency, setPrefCurrency] = useState(localStorage.getItem("prefCurrency") || "KRW");

  const { data: curNMData = [] } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
  });
  const currencies = Array.isArray(curNMData) ? curNMData : (curNMData?.result || []);


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
  };  


  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPassword((prev) => ({ ...prev, [name]: value }));
  };

  const saveSettings = () => {
    if (password.new !== password.confirm) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    localStorage.setItem("prefCurrency", prefCurrency);

    // 수정된 API 파라미터 (주소 포함)
    updateProfileMutation.mutate({
      user: user.username,
      password: password.new,
      imgMyProfile: imgMyProfile, // ✅ 추가
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (data) => {
      updateUser({
      });
      setPassword({ new: "", confirm: "" });
      alert("설정이 저장되었습니다.");
    },
    onError: (error) => {
      alert("저장에 실패했습니다.");
    },
  });

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
          {previewImg && (
            <img
              src={previewImg}
              alt="미리보기"
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                objectFit: "cover",
                marginBottom: "10px",
                border: "1px solid #ddd"
              }}
            />
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
        </div>
      </section>

      {/* 비밀번호 수정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><Lock size={20} /> 암호 수정</h3>
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

      {/* 선호 통화 설정 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><DollarSign size={20} /> 선호 통화 설정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>대시보드 표시 통화</label>
          <TextField
            select
            value={prefCurrency}
            onChange={(e) => setPrefCurrency(e.target.value)}
            sx={{ width: "300px", "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: { maxHeight: 300 }, // 세로 스크롤 생성 (길이 제한)
                },
              },
            }}
          >
            <MenuItem value="KRW">KRW (한국 원)</MenuItem>
            {currencies.filter(c => c.currency !== "KRW").map(c => (
              <MenuItem key={c.currency} value={c.currency}>{c.currency} ({c.cur_nm})</MenuItem>
            ))}
          </TextField>
          <p className={styles.helperText}>* 메인 페이지 및 분석 페이지의 구독 금액이 해당 통화로 변환되어 표시됩니다.</p>
        </div>
      </section>

      <button 
        onClick={saveSettings} 
        className={styles.saveButton}
        disabled={updateProfileMutation.isPending} // isLoading 대신 isPending 권장
      >
        {updateProfileMutation.isPending ? "저장 중..." : "설정 저장하기"}
      </button>
    </div>
  );
};

export default ProfilePage;