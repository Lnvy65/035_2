import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Box, InputAdornment, Button, MenuItem 
} from "@mui/material";
import useAuthStore from "../store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  CUR_NM: "",
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

    // const priceNum = String(form.MONTHLY_PRICE).replace(/,/g, "");
    //임시 - 공유 사용자 수에 따른 가격 분할 로직 추가
    const originalPrice = Number(String(form.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(form.SHARED_USERS) || 1;
    const priceNum = Math.round(originalPrice / users);

    const { SHARED_USERS, ...saveData } = form;


    onSave({ 
      ...saveData, 
      MONTHLY_PRICE: priceNum,
      userName: user?.username
    });
    setForm(INITIAL_STATE);
    // onSave({ 
    //   ...form, 
    //   MONTHLY_PRICE: priceNum, 
    //   userName: user?.username 
    // });
    // setForm(INITIAL_STATE);
  };

  // 입력 핸들러 공통화
  const handleChange = (field) => (e) => {
    let value = e.target.value;
    if (field === 'MONTHLY_PRICE') {
      const rawValue = value.replace(/[^0-9]/g, "");
      value = rawValue ? Number(rawValue).toLocaleString() : "";
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
    return price > 0 && users > 1 ? Math.floor(price / users).toLocaleString() : "";
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
            InputProps={{ endAdornment: <InputAdornment position="end"></InputAdornment> }} 
          />
          
          <TextField
            select // 드롭다운 형식으로 변환
            label="통화"
            fullWidth
            value={form.CUR_NM}
            onChange={handleChange('CUR_NM')}
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
            helperText={getCalculatedPrice() ? `1인당 청구 금액: ${getCalculatedPrice()}원` : "나 혼자 사용하는 경우 1을 입력하세요."}
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