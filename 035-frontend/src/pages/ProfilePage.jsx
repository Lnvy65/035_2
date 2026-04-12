import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import useAuthStore from "../store/authStore";
import { updateProfileApi } from "../api/userApi";
import styles from "../styles/ProfilePage.module.css";
import { Lock, DollarSign, Settings, MapPin, Search } from "lucide-react";
import DaumPostcode from "react-daum-postcode";

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  
  // 상태 관리
  const [exchangeRate, setExchangeRate] = useState(user?.my_exchange_rate || "");
  const [address, setAddress] = useState(user?.address || ""); // 주소 상태 추가
  const [isPostcodeOpen, setIsPostcodeOpen] = useState(false); // 주소창 팝업 여부  
  const [imgMyProfile, setImgMyProfile] = useState(null); // 상단 useState 추가
  const [previewImg, setPreviewImg] = useState(null);  // 상단 useState 추가 
  const [password, setPassword] = useState({
    current: "",
    new: "",
    confirm: "",
  });


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


  // 주소 선택 완료 핸들러
  const handleAddressComplete = (data) => {
    let fullAddress = data.address;
    let extraAddress = "";

    if (data.addressType === "R") {
      if (data.bname !== "") extraAddress += data.bname;
      if (data.buildingName !== "") {
        extraAddress += extraAddress !== "" ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== "" ? ` (${extraAddress})` : "";
    }

    setAddress(fullAddress);
    setIsPostcodeOpen(false);
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

    if (!exchangeRate || isNaN(exchangeRate) || Number(exchangeRate) <= 0) {
      alert("유효한 환율 값이 아닙니다.");
      return;
    }

    // 수정된 API 파라미터 (주소 포함)
    updateProfileMutation.mutate({
      user: user.username,
      password: password.new,
      buyingAmt: exchangeRate,
      address: address, // 주소 추가
      imgMyProfile: imgMyProfile, // ✅ 추가
    });
  };

  const updateProfileMutation = useMutation({
    mutationFn: updateProfileApi,
    onSuccess: (data) => {
      updateUser({ 
        my_exchange_rate: Number(data.my_exchange_rate),
        address: data.address // 전역 스토어 업데이트
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

      {/* 주소 설정 섹션 (새로 추가) */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><MapPin size={20} /> 주소 설정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>배송지/활동 주소</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={address}
              readOnly
              className={styles.input}
              placeholder="주소 검색을 클릭해 주세요"
            />
            <button 
              type="button"
              onClick={() => setIsPostcodeOpen(!isPostcodeOpen)}
              className={styles.searchButton} // CSS 추가 필요
              style={{ display: "flex", alignItems: "center", gap: "4px", padding: "0 15px", whiteSpace: "nowrap" }}
            >
              <Search size={16} /> 주소 검색
            </button>
          </div>
          
          {/* 주소 검색창 레이어 */}
          {isPostcodeOpen && (
            <div style={{ 
              border: "1px solid #ccc", 
              marginTop: "10px", 
              width: "520px",  // 너비 조절
              height: "300px", // 높이 조절       
              position: "relative" 
            }}>
              <DaumPostcode onComplete={handleAddressComplete} autoClose={false} />
              <button 
                onClick={() => setIsPostcodeOpen(false)}
                style={{ width: "100%", padding: "10px", background: "#f4f4f4", border: "none", cursor: "pointer" }}
              >
                닫기
              </button>
            </div>
          )}
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

      {/* 환율 가이드라인 섹션 */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}><DollarSign size={20} /> 가이드라인 설정</h3>
        <div className={styles.inputGroup}>
          <label className={styles.label}>기준 환율 (1 USD)</label>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="number"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              className={`${styles.input} ${styles.inputNumber}`}
            />
            <span className={styles.currencyUnit}>KRW</span>
          </div>
          <p className={styles.helperText}>* 환율에 적용될 개인가이드라인 입니다.</p>
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