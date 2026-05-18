import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Box, InputAdornment, Button, MenuItem 
} from "@mui/material";
import useAuthStore from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import { selectcurnmApi } from "../api/mainpageApi";


// 상수 데이터 분리
const PRESET_SERVICES = [
  { name: "YouTube Premium", price: 14900, category: "OTT" },
  { name: "Netflix", price: 17000, category: "OTT" },
  { name: "Spotify", price: 10900, category: "음악" },
  { name: "Disney+", price: 9900, category: "OTT" },
  { name: "Coupang Wow", price: 7890, category: "쇼핑" },
  { name: "직접 입력", price: "", category: "" },
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CYCLES = [1, 3, 6, 12];

const INITIAL_STATE = {
  SERVICE_NM: "",
  MONTHLY_PRICE: "",
  CUR_NM: "KRW",
  ANCHOR_DAY: "",
  BILLING_CYCLE: "",
  CATEGORY: "",
  SHARED_USERS: 1,
};

const CreateSubModal = ({ open, onClose, onSave, isLoading, existingSubscriptions = []}) => {
  const user = useAuthStore((state) => state.user);
  const userName = user?.username;

  const [form, setForm] = useState(INITIAL_STATE);

  const handleClose = () => {
    setForm(INITIAL_STATE);
    onClose();
  };

  const handleSave = () => {
    const isDuplicate = existingSubscriptions.some(sub => sub.SERVICE_NM === form.SERVICE_NM);
    if (isDuplicate) {
      const isConfirmed = window.confirm("이미 등록된 서비스입니다. 그래도 추가하시겠습니까?");
      if (!isConfirmed) return;
    }

    const originalPrice = Number(String(form.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(form.SHARED_USERS) || 1;
    
    let priceNum = originalPrice / users;
    if (form.CUR_NM === 'KRW' || form.CUR_NM === 'JPY') {
      priceNum = Math.floor(priceNum); // 원/엔화는 소수점 버림
    } else {
      priceNum = Math.floor(priceNum * 100) / 100; // 외화는 소수점 2자리 내림
    }

    const { SHARED_USERS, ...saveData } = form;

    onSave({ 
      ...saveData, 
      MONTHLY_PRICE: priceNum,
      userName: user?.username
    });
    setForm(INITIAL_STATE);
  };

  // 입력 핸들러 공통화
  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'MONTHLY_PRICE') {
      const rawValue = value.replace(/[^0-9.]/g, ""); // 소수점 허용
      const parts = rawValue.split('.');
      parts[0] = parts[0] ? Number(parts[0]).toLocaleString() : "";
      value = parts.length > 1 ? parts[0] + '.' + parts[1].slice(0, 4) : parts[0]; // 입력은 정밀도를 위해 소수점 4자리까지
    } 
    // 공유 사용자 수는 최소 1명으로 제한
    else if (field === 'SHARED_USERS') {
      value = Math.max(1, Number(value));
    }
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const getCalculatedPrice = () => {
    const price = Number(String(form.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(form.SHARED_USERS) || 1;
    if (price > 0 && users > 1) {
      let calc = price / users;
      if (form.CUR_NM === 'KRW' || form.CUR_NM === 'JPY') {
        calc = Math.floor(calc);
      } else {
        calc = Math.floor(calc * 100) / 100;
      }
      const parts = String(calc).split('.');
      parts[0] = Number(parts[0]).toLocaleString();
      return parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
    }
    return "";
  };

  const { data: curNMData = [], isLoading: iscurNMLoading, refetch: refetchCurNM } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
  });

   const currencies = Array.isArray(curNMData) ? curNMData : [];

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 'bold' }}>새로운 구독 추가</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            select label="서비스 빠른 선택"
            value={PRESET_SERVICES.some(s => s.name === form.SERVICE_NM) ? form.SERVICE_NM : ''}
            onChange={(e) => {
              const selected = PRESET_SERVICES.find(s => s.name === e.target.value);
              if (selected && selected.name !== "직접 입력") {
                setForm({
                  ...form,
                  SERVICE_NM: selected.name,
                  MONTHLY_PRICE: selected.price.toLocaleString(),
                  CATEGORY: selected.category
                });
              }
            }}
          >
            {PRESET_SERVICES.map((s) => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}
          </TextField>

          <TextField label="서비스 이름" fullWidth value={form.SERVICE_NM} onChange={handleChange('SERVICE_NM')} />
          <TextField 
            label="월 구독료" 
            fullWidth 
            value={form.MONTHLY_PRICE} 
            onChange={handleChange('MONTHLY_PRICE')}
            InputProps={{ endAdornment: <InputAdornment position="end">{form.CUR_NM === "KRW" ? "원" : form.CUR_NM}</InputAdornment> }} 
          />
          
          <TextField
            select // 드롭다운 형식으로 변환
            label="통화"
            fullWidth
            value={form.CUR_NM}
            onChange={(e) => {
              const newCurrency = e.target.value;
              const oldCurrency = form.CUR_NM || "KRW";
              let updatedPrice = form.MONTHLY_PRICE;

              if (currencies.length > 0) {
                const oldCurrencyData = currencies.find(c => c.currency === oldCurrency);
                const newCurrencyData = currencies.find(c => c.currency === newCurrency);

                // DB에 해당 통화가 없으면 기본값인 1(기준 통화)로 처리
                const oldRate = oldCurrencyData && oldCurrencyData.exchange_rate ? Number(oldCurrencyData.exchange_rate) : 1;
                const newRate = newCurrencyData && newCurrencyData.exchange_rate ? Number(newCurrencyData.exchange_rate) : 1;

                const currentPriceRaw = Number(String(form.MONTHLY_PRICE).replace(/,/g, ""));
                
                if (!isNaN(currentPriceRaw) && currentPriceRaw > 0) {
                  let convertedPrice = (currentPriceRaw * oldRate) / newRate;
                  // 원/엔화는 정수, 나머지는 소수점 2자리까지
                  if (newCurrency === 'KRW' || newCurrency === 'JPY') {
                    convertedPrice = Math.round(convertedPrice);
                  } else {
                    convertedPrice = Math.round(convertedPrice * 10000) / 10000; // 환율 변환 시 소수점 4자리까지 유지
                  }
                  const parts = String(convertedPrice).split('.');
                  parts[0] = Number(parts[0]).toLocaleString();
                  updatedPrice = parts.length > 1 ? parts[0] + '.' + parts[1] : parts[0];
                }
              }
              
              setForm({...form, CUR_NM: newCurrency, MONTHLY_PRICE: updatedPrice});
            }}
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
              <MenuItem key={option.currency} value={option.currency}>
                {option.cur_nm} ({option.currency})
              </MenuItem>
            ))}
          </TextField>
          
          <TextField 
            label="공유 인원" 
            type="number"
            fullWidth 
            value={form.SHARED_USERS} 
            onChange={handleChange('SHARED_USERS')}
            helperText={getCalculatedPrice() ? `1인당 청구 금액: ${getCalculatedPrice()}${form.CUR_NM === "KRW" ? "원" : ` ${form.CUR_NM}`}` : "나 혼자 사용하는 경우 1을 입력하세요."}
            inputProps={{ min: 1 }}
          />

          <TextField 
            select 
            label="정기 결제일" 
            fullWidth 
            value={form.ANCHOR_DAY} 
            onChange={handleChange('ANCHOR_DAY')}
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
            {DAYS.map(d => <MenuItem key={d} value={d}>{d === 31 ? "말일" : `${d}일`}</MenuItem>)}
          </TextField>
          <TextField select label="결제 주기" fullWidth value={form.BILLING_CYCLE} onChange={handleChange('BILLING_CYCLE')}>
            {CYCLES.map(c => <MenuItem key={c} value={c}>{c}개월</MenuItem>)}
          </TextField>
          <TextField label="카테고리" fullWidth value={form.CATEGORY} onChange={handleChange('CATEGORY')} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose}>취소</Button>
        <Button 
          variant="contained" 
          onClick={handleSave}
          disabled={!form.SERVICE_NM || !form.MONTHLY_PRICE || isLoading}
          sx={{ bgcolor: '#3b82f6' }}
        >
          저장하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSubModal;