import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, InputAdornment, Button, MenuItem, Chip } from "@mui/material";
import { DAYS, CYCLES } from '../utils/constants';
import { useQuery } from "@tanstack/react-query";
import { selectcurnmApi } from "../api/mainpageApi";
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

const EditSubModal = ({ open, editData, onClose, onSave, isLoading }) => {
  // 상위 컴포넌트 렌더링 방지를 위한 로컬 상태 도입
  const [formData, setFormData] = useState(null);

  // 통화 데이터 로드
  const { data: curNMData = [] } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });

  const currencies = Array.isArray(curNMData) ? curNMData : [];

  // editData가 변경될 때마다 formData를 업데이트하여 초기값 설정
  useEffect(() => {
    if (editData && open && curNMData.length > 0) {
      const initialKoreanName = editData.CUR_NM; 
      const matchedCurrency = curNMData.find(item => item.CUR_NM === initialKoreanName);
      const currencyCode = matchedCurrency ? matchedCurrency.CURRENCY : initialKoreanName;
      const formattedPrice = editData.MONTHLY_PRICE ? Number(editData.MONTHLY_PRICE).toLocaleString() : "";

      setFormData({ 
        ...editData, 
        CUR_NM: currencyCode, 
        MONTHLY_PRICE: formattedPrice, 
        SHARED_USERS: 1 
      });
    }
  }, [editData, open, curNMData]);

  // 초기값이 설정되기 전까지는 렌더링하지 않도록 처리
  if (!formData) return null;

  // 💡 DatePicker 전용 날짜 변경 및 유효성 검사 핸들러
  const handleDatePickerChange = (newValue) => {
    if (!newValue || !newValue.isValid()) {
      setFormData({ ...formData, NEXT_BILLING_DT: "" });
      return;
    }

    const today = dayjs().startOf('day');
    
    // [유효성 검사] 오늘보다 과거인지 확인
    if (newValue.isBefore(today)) {
      alert("결제 예정일은 오늘보다 이전일 수 없습니다. 기존 날짜로 되돌립니다.");
      setFormData({ 
        ...formData, 
        NEXT_BILLING_DT: editData.NEXT_BILLING_DT,
        ANCHOR_DAY: editData.ANCHOR_DAY 
      });
      return;
    }

    // 오늘 이후의 정상 날짜라면 반영 및 정기 결제일(Anchor Day) 보정
    const finalDateStr = newValue.format('YYYY-MM-DD');
    const day = newValue.date();
    const lastDayInMonth = newValue.endOf('month').date();
    const matchedAnchorDay = (day === lastDayInMonth) ? 31 : day;

    setFormData({ 
      ...formData, 
      NEXT_BILLING_DT: finalDateStr, 
      ANCHOR_DAY: matchedAnchorDay 
    });
  };

  // 변경 감지 로직 (공유 사용자 수는 비교에서 제외)
  const { SHARED_USERS, ...compareData } = formData;

  // 가격 비교 시 쉼표 제거 후 숫자로 비교
  const currentPrice = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
  const originalPrice = Number(editData?.MONTHLY_PRICE) || 0;

  // 변경 사항이 없는지 확인하는 변수
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

  // 저장 버튼 클릭 시 처리
  const handleSaveClick = () => {
    // 1. 문자열 상태인 가격을 숫자로 변환
    const priceWithoutComma = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    
    // 2. 인원수로 나눈 후, 소수점 둘째 자리까지만 남기도록 처리 (달러 센트 기준 계산)
    // 단, 공유 인원이 1명일 때는 나누기 없이 입력값 그대로 소수점을 유지합니다.
    const rawPrice = priceWithoutComma / users;
    const finalPrice = users > 1 ? Number(rawPrice.toFixed(2)) : rawPrice;

    onSave({ ...compareData, MONTHLY_PRICE: finalPrice });
  };

  // 공유 사용자 수에 따른 1인당 청구 금액 계산 함수
  const getCalculatedPrice = () => {
    const price = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    
    if (price > 0 && users > 1) {
      const perPerson = price / users;
      // 소수점이 있으면 둘째자리까지 포맷팅, 없으면 정수로 깔끔하게 출력
      return perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return "";
  };

  // 결제 주기 변경 시 결제 예정일 자동 조정 로직
  const handleMonthChange = (e) => {
    const newCycle = parseInt(e.target.value, 10);
    const originalCycle = parseInt(editData.BILLING_CYCLE, 10);
    const originalDateStr = editData.NEXT_BILLING_DT;
    
    if (newCycle === originalCycle) {
      setFormData({
        ...formData,
        BILLING_CYCLE: originalCycle,
        NEXT_BILLING_DT: originalDateStr
      });
      return;
    }

    let targetDate = new Date(originalDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!isNaN(targetDate.getTime())) {
      const diffMonths = newCycle - originalCycle;
      targetDate.setMonth(targetDate.getMonth() + diffMonths);

      while (targetDate < today) {
        targetDate.setMonth(targetDate.getMonth() + newCycle);
      }

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, "0");
      const day = String(targetDate.getDate()).padStart(2, "0");
      
      setFormData({
        ...formData,
        BILLING_CYCLE: e.target.value,
        NEXT_BILLING_DT: `${year}-${month}-${day}`
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
            label="월 구독료" 
            fullWidth 
            InputProps={{ endAdornment: <InputAdornment position="end">원</InputAdornment> }}
            value={formData.MONTHLY_PRICE || ''}
            onChange={(e) => {
              let value = e.target.value;
              let cleaned = value.replace(/[^0-9.]/g, "");
              const parts = cleaned.split(".");
              if (parts.length > 2) {
                cleaned = parts[0] + "." + parts.slice(1).join("");
              }
              setFormData({ ...formData, MONTHLY_PRICE: cleaned });
            }}
          />

          <TextField 
            label="통화" 
            select
            fullWidth 
            value={formData.CUR_NM || ''} 
            onChange={(e) => setFormData({...formData, CUR_NM: e.target.value})}
            helperText="통화를 선택하세요."
            SelectProps={{
              MenuProps: { PaperProps: { style: { maxHeight: 300, width: 250 } } },
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
            helperText={getCalculatedPrice() ? `수정될 1인당 청구 금액: ${getCalculatedPrice()} ${formData?.CUR_NM}` : "가격을 수정하고 인원을 나누려면 입력하세요."}
            inputProps={{ min: 1 }}
          />

          {/* 캘린더 피커 적용 영역 */}
          <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
            <DatePicker
              label="결제 예정일"
              value={formData.NEXT_BILLING_DT ? dayjs(formData.NEXT_BILLING_DT) : null}
              onChange={handleDatePickerChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  placeholder: "YYYY-MM-DD", 
                },
              }}
            />
          </LocalizationProvider>
          
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

          <TextField
            label="카테고리"
            fullWidth
            placeholder="OTT, 작업, 음악 등"
            value={formData.CATEGORY || ''}
            onChange={(e) => setFormData({...formData, CATEGORY: e.target.value})}
          />
          
          <TextField
            select
            label="상태"
            fullWidth
            value={formData.USE_YN || 'Y'}
            onChange={(e) => setFormData({ ...formData, USE_YN: e.target.value })}
          >
            <MenuItem value="Y">
              <Chip label="사용 중" color="success" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
            </MenuItem>
            <MenuItem value="N">
              <Chip label="만료됨" color="error" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
            </MenuItem>
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