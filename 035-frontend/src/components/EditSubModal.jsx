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
  const [formData, setFormData] = useState(null);

  const { data: curNMData = [] } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });

  const currencies = Array.isArray(curNMData) ? curNMData : [];

  useEffect(() => {
    if (editData && open && curNMData.length > 0) {
      const initialKoreanName = editData.CUR_NM; 
      const matchedCurrency = curNMData.find(item => item.CUR_NM === initialKoreanName);
      const currencyCode = matchedCurrency ? matchedCurrency.CURRENCY : initialKoreanName;
      
      // ⭐ 초기 데이터를 로드할 때도 천 단위 콤마를 적용합니다.
      const formattedPrice = editData.MONTHLY_PRICE ? Number(editData.MONTHLY_PRICE).toLocaleString() : "";

      setFormData({ 
        ...editData, 
        CUR_NM: currencyCode, 
        MONTHLY_PRICE: formattedPrice, 
        SHARED_USERS: 1 
      });
    }
  }, [editData, open, curNMData]);

  if (!formData) return null;

  const handleDatePickerChange = (newValue) => {
    if (!newValue || !newValue.isValid()) {
      setFormData({ ...formData, NEXT_BILLING_DT: "" });
      return;
    }

    const today = dayjs().startOf('day');
    
    if (newValue.isBefore(today)) {
      alert("결제 예정일은 오늘보다 이전일 수 없습니다. 기존 날짜로 되돌립니다.");
      setFormData({ 
        ...formData, 
        NEXT_BILLING_DT: editData.NEXT_BILLING_DT,
        ANCHOR_DAY: editData.ANCHOR_DAY 
      });
      return;
    }

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

  const { SHARED_USERS, ...compareData } = formData;

  // 가격 비교 시 쉼표 제거 후 숫자로 비교
  const currentPrice = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
  const originalPrice = Number(editData?.MONTHLY_PRICE) || 0;

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

  const handleSaveClick = () => {
    const priceWithoutComma = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    
    const rawPrice = priceWithoutComma / users;
    const finalPrice = users > 1 ? Number(rawPrice.toFixed(2)) : rawPrice;

    onSave({ ...compareData, MONTHLY_PRICE: finalPrice });
  };

  const getCalculatedPrice = () => {
    const price = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    
    if (price > 0 && users > 1) {
      const perPerson = price / users;
      return perPerson.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    return "";
  };

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
          
          {/* ⭐ 월 구독료 필드 수정됨 */}
          <TextField
            label="월 구독료" 
            fullWidth 
            InputProps={{ endAdornment: <InputAdornment position="end">원</InputAdornment> }}
            value={formData.MONTHLY_PRICE || ''}
            onChange={(e) => {
              const input = e.target;
              const originalSelectionStart = input.selectionStart; // ⭐ 1. 변경 전 커서 위치 기억
              const originalLength = input.value.length; // 변경 전 글자 길이 기억
              
              let value = input.value;
              
              // 숫자와 마침표(.)를 제외한 모든 문자 제거
              let cleaned = value.replace(/[^0-9.]/g, "");
              
              // 마침표 중복 입력 방지
              const parts = cleaned.split(".");
              if (parts.length > 2) {
                cleaned = parts[0] + "." + parts.slice(1).join("");
              }
              
              // 정수 부분에 천 단위 콤마 추가
              const integerPart = parts[0];
              const decimalPart = parts[1];

              if (integerPart) {
                const formattedInteger = Number(integerPart).toLocaleString();
                value = decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger;
              } else {
                value = cleaned;
              }

              // 상태 업데이트
              setFormData({ ...formData, MONTHLY_PRICE: value });

              // ⭐ 2. 렌더링 직후 커서 위치를 계산해서 제자리에 돌려놓기
              setTimeout(() => {
                // 새로운 콤마가 추가되거나 삭제되면서 생기는 길이 변화를 계산합니다.
                const lengthDiff = value.length - originalLength;
                const newSelectionStart = originalSelectionStart + lengthDiff;
                
                // 커서 위치 지정
                input.setSelectionRange(newSelectionStart, newSelectionStart);
              }, 0);
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

          <TextField select label="결제 주기" fullWidth value={formData.BILLING_CYCLE || ''} onChange={handleMonthChange} SelectProps={{ MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } } }}>
            {CYCLES.map((cycle) => (
              <MenuItem key={cycle} value={cycle}>{cycle}개월</MenuItem>
            ))}
          </TextField>

          <TextField label="카테고리" fullWidth placeholder="OTT, 작업, 음악 등" value={formData.CATEGORY || ''} onChange={(e) => setFormData({...formData, CATEGORY: e.target.value})} />
          
          <TextField select label="상태" fullWidth value={formData.USE_YN || 'Y'} onChange={(e) => setFormData({ ...formData, USE_YN: e.target.value })}>
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