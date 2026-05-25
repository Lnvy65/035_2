import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, InputAdornment, Button, MenuItem, Chip } from "@mui/material";
import { DAYS, CYCLES } from '../utils/constants';
import useAuthStore from "../store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { selectcurnmApi } from "../api/mainpageApi";

const EditSubModal = ({ open, editData, onClose, onSave, isLoading }) => {
  // 상위 컴포넌트 렌더링 방지를 위한 로컬 상태 도입
  const [formData, setFormData] = useState(null);

  // 통화 데이터 로드
  const { data: curNMData = [], isLoading: iscurNMLoading, refetch: refetchCurNM } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });

  // editData가 변경될 때마다 formData를 업데이트하여 초기값 설정 (curNMData가 로드된 후 매핑)
  const currencies = Array.isArray(curNMData) ? curNMData : [];

  // editData가 변경될 때마다 formData를 업데이트하여 초기값 설정 (curNMData가 로드된 후 매핑)
  useEffect(() => {
  if (editData && open && curNMData.length > 0) {
      // 1. 그리드에서 넘어온 한글 값 (예: "한국 원")
      const initialKoreanName = editData.CUR_NM; 

      // 2. 전체 리스트(curNMData)에서 한글 이름이 일치하는 항목 찾기
      const matchedCurrency = curNMData.find(item => item.CUR_NM === initialKoreanName);

      // 3. 일치하는 코드가 있으면 영어 코드(KRW)를 사용, 없으면 그대로 사용
      const currencyCode = matchedCurrency ? matchedCurrency.CURRENCY : initialKoreanName;

      const formattedPrice = editData.MONTHLY_PRICE ? Number(editData.MONTHLY_PRICE).toLocaleString() : "";

      setFormData({ 
        ...editData, 
        CUR_NM: currencyCode, // 이제 상태값은 "KRW" 같은 영어 코드가 됨
        MONTHLY_PRICE: formattedPrice, 
        SHARED_USERS: 1 
      });
    }
  }, [editData, open, curNMData]); // curNMData가 로드된 후 매핑하기 위해 의존성 추가

  // 초기값이 설정되기 전까지는 렌더링하지 않도록 처리
  if (!formData) return null;

  // 날짜 입력 시 포맷팅
  const handleDateChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
      .replace(/^(\d{4})(\d{2})$/, "$1-$2")
      .substring(0, 10);
    setFormData({ ...formData, NEXT_BILLING_DT: formattedValue });
  };

  // 날짜 입력 후 포맷팅 및 유효성 검사
  const handleDateBlur = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) return;

    let year, month, day;
    if (value.length === 6) {
      year = parseInt("20" + value.slice(0, 2), 10);
      month = parseInt(value.slice(2, 4), 10);
      day = parseInt(value.slice(4, 6), 10);
    } 
    else if (value.length === 8) {
      year = parseInt(value.slice(0, 4), 10);
      month = parseInt(value.slice(4, 6), 10);
      day = parseInt(value.slice(6, 8), 10);
    } 
    else {
      const parts = e.target.value.split("-");
      if (parts.length !== 3) return;
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10); 
    }

    // 기본적인 월/일 유효성 보정
    if (month > 12) month = 12;
    if (month < 1 || isNaN(month)) month = 1;
    const lastDayInMonth = new Date(year, month, 0).getDate();
    if (day > lastDayInMonth) day = lastDayInMonth; 
    if (day < 1 || isNaN(day)) day = 1;

    // 최종 날짜 문자열 생성
    const finalDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const finalDateObj = new Date(finalDateStr);
    
    // 오늘 날짜 (시간 제거)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // [로직 추가] 오늘보다 과거인지 확인
    if (finalDateObj < today) {
      alert("결제 예정일은 오늘보다 이전일 수 없습니다. 기존 날짜로 되돌립니다.");
      
      // 원본 데이터로 복구
      setFormData({ 
        ...formData, 
        NEXT_BILLING_DT: editData.NEXT_BILLING_DT,
        ANCHOR_DAY: editData.ANCHOR_DAY // 정기 결제일도 함께 복구
      });
    } else {
      // 오늘 이후라면 정상 반영
      const matchedAnchorDay = (day === lastDayInMonth) ? 31 : day;
      setFormData({ ...formData, NEXT_BILLING_DT: finalDateStr, ANCHOR_DAY: matchedAnchorDay });
    }
  };

  // 변경 감지 로직 (공유 사용자 수는 비교에서 제외)
  const { SHARED_USERS, ...compareData } = formData;

  // 가격 비교 시 쉼표 제거 후 숫자로 비교
  const currentPrice = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));

  // editData의 MONTHLY_PRICE는 숫자, formData의 MONTHLY_PRICE는 문자열이므로 형 변환 후 비교
  const originalPrice = Number(editData?.MONTHLY_PRICE) || 0;

  // editData의 MONTHLY_PRICE는 숫자, formData의 MONTHLY_PRICE는 문자열이므로 형 변환 후 비교
  const isUnchanged = 
    formData?.SERVICE_NM === editData?.SERVICE_NM &&
    currentPrice === originalPrice &&
    formData?.CUR_NM === (currencies.find(c => c.CUR_NM === editData?.CUR_NM)?.CURRENCY || editData?.CUR_NM) &&
    formData?.NEXT_BILLING_DT === editData?.NEXT_BILLING_DT &&
    formData?.BILLING_CYCLE === editData?.BILLING_CYCLE &&
    formData?.ANCHOR_DAY === editData?.ANCHOR_DAY &&
    formData?.CATEGORY === editData?.CATEGORY &&
    formData?.USE_YN === editData?.USE_YN &&
    (Number(formData?.SHARED_USERS) === 1 || !formData?.SHARED_USERS);

  // 저장 버튼 클릭 시 공유 사용자 수에 따른 가격 조정 로직 추가
  const handleSaveClick = () => {
    const priceWithoutComma = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    const finalPrice = Math.floor(priceWithoutComma / users);

    onSave({ ...compareData, MONTHLY_PRICE: finalPrice });
  };

  // 공유 사용자 수에 따른 1인당 청구 금액 계산 함수
  const getCalculatedPrice = () => {
    const price = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    return price > 0 && users > 1 ? Math.floor(price / users).toLocaleString() : "";
  };

  // 결제 주기 변경 시 결제 예정일 자동 조정 로직 추가
  const handleMonthChange = (e) => {
    const newCycle = parseInt(e.target.value, 10);
    const originalCycle = parseInt(editData.BILLING_CYCLE, 10);
    const originalDateStr = editData.NEXT_BILLING_DT;
    
    // 1. 원본 데이터와 선택한 주기가 같으면 초기 데이터로 복구
    if (newCycle === originalCycle) {
      setFormData({
        ...formData,
        BILLING_CYCLE: originalCycle,
        NEXT_BILLING_DT: originalDateStr
      });
      return;
    }

    // 2. 기준일 설정
    let targetDate = new Date(originalDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isNaN(targetDate.getTime())) {
      // [수정 포인트] 기준일에서 주기의 차이만큼만 월을 변경합니다.
      // JS의 setMonth는 날짜(Day)를 최대한 유지하려고 시도합니다.
      const diffMonths = newCycle - originalCycle;
      targetDate.setMonth(targetDate.getMonth() + diffMonths);

      // 3. 오늘보다 과거라면? 오늘 이후 가장 가까운 결제일이 될 때까지 주기를 더함
      // (기록형이므로 '날짜'는 유지하면서 '회차'만 미래로 보냄)
      while (targetDate < today) {
        targetDate.setMonth(targetDate.getMonth() + newCycle);
      }

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");
      
      const newNextBillingDt = `${year}-${month}-${day}`;

      setFormData({
        ...formData,
        BILLING_CYCLE: e.target.value,
        NEXT_BILLING_DT: newNextBillingDt
      });
    } else {
      setFormData({ ...formData, BILLING_CYCLE: e.target.value });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "12px", padding: "10px" } }}>
      <DialogTitle sx={{ fontWeight: 'bold' }}>게시글 수정 / 상세보기</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="서비스 이름" fullWidth value={formData.SERVICE_NM || ''} onChange={(e) => setFormData({...formData, SERVICE_NM: e.target.value})} />
          <TextField
            label="월 구독료" fullWidth InputProps={{ endAdornment: <InputAdornment position="end">원</InputAdornment> }}
            value={formData.MONTHLY_PRICE || ''}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9]/g, "");
              setFormData({...formData, MONTHLY_PRICE: rawValue ? Number(rawValue).toLocaleString() : ""});
            }}
          />

          <TextField 
            label="통화" 
            type="text"
            select
            fullWidth 
            value={formData.CUR_NM || ''} 
            onChange={(e) => setFormData({...formData, CUR_NM: e.target.value})}
            helperText="통화를 선택하세요."
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: {
                    maxHeight: 300, // ✅ 최대 높이를 300px로 제한 (스크롤 생성)
                    width: 250,     // ✅ 너비 고정
                  },
                },
              },
            }}
          >
          {currencies.map((option) => (
            <MenuItem key={option.CURRENCY} value={option.CURRENCY}>
              {option.CUR_NM} ({option.CURRENCY})
            </MenuItem>
          ))}
          </TextField>

          <TextField 
            label="공유 인원" 
            type="number"
            fullWidth 
            value={formData.SHARED_USERS || 1} 
            onChange={(e) => setFormData({...formData, SHARED_USERS: Math.max(1, parseInt(e.target.value) || 1)})}
            helperText={getCalculatedPrice() ? `수정될 1인당 청구 금액: ${getCalculatedPrice()}원` : "가격을 수정하고 인원을 나누려면 입력하세요."}
            inputProps={{ min: 1 }}
          />

          <TextField label="결제 예정일" fullWidth value={formData.NEXT_BILLING_DT || ''} placeholder="8자리 또는 6자리로 입력" onChange={handleDateChange} onBlur={handleDateBlur} inputProps={{ maxLength: 10 }} />
          
          <TextField select label="정기 결제일" fullWidth value={formData.ANCHOR_DAY || ''} 
            onChange={(e) => {
              const newAnchorDay = parseInt(e.target.value, 10);
              const baseDate = formData.NEXT_BILLING_DT ? new Date(formData.NEXT_BILLING_DT) : new Date();
              const year = baseDate.getFullYear(); const month = baseDate.getMonth() + 1;
              const lastDayInMonth = new Date(year, month, 0).getDate();
              let targetDay = newAnchorDay === 31 || newAnchorDay > lastDayInMonth ? lastDayInMonth : newAnchorDay;
              setFormData({ ...formData, ANCHOR_DAY: newAnchorDay, NEXT_BILLING_DT: `${year}-${String(month).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}` });
            }} SelectProps={{ MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } } }}
          >
            {DAYS.map((day) => (<MenuItem key={day} value={day}>{day === 31 ? "말일" : `${day}일`}</MenuItem>))}
          </TextField>

          <TextField 
            select 
            label="결제 주기" 
            fullWidth 
            value={formData.BILLING_CYCLE || ''} 
            onChange={handleMonthChange} 
            SelectProps={{ MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } } }}
          >
            {CYCLES.map((cycle) => (
              <MenuItem key={cycle} value={cycle}>{cycle}개월</MenuItem>
            ))}
          </TextField>

          <TextField label="카테고리" fullWidth placeholder="OTT, 작업, 음악 등" value={formData.CATEGORY || ''} onChange={(e) => setFormData({...formData, CATEGORY: e.target.value})} />
          
          <TextField select label="상태" fullWidth value={formData.USE_YN || 'Y'} onChange={(e) => setFormData({ ...formData, USE_YN: e.target.value })}>
            <MenuItem value="Y"><Chip label="사용 중" color="success" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} /></MenuItem>
            <MenuItem value="N"><Chip label="만료됨" color="error" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} /></MenuItem>
          </TextField>

          <TextField label="생성일" disabled fullWidth value={formData.CREATE_DT || ''} />
          <TextField label="수정일" disabled fullWidth value={formData.UPDATE_DT || ''} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">닫기</Button>
        <Button onClick={handleSaveClick}
          disabled={isLoading || isUnchanged}
          variant="contained"
          sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}
        >
          저장하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditSubModal;