// src/components/CreateSubModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Box, 
  InputAdornment, 
  Button, 
  MenuItem 
} from "@mui/material";

// 💡 문제 해결 포인트: 선택지에 필요한 데이터를 파일 내부에 직접 선언합니다.
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

const CreateSubModal = ({ open, onClose, onSave, isLoading, username }) => {
  const [newSub, setNewSub] = useState({
    username: username || "", 
    SERVICE_NM: "", 
    MONTHLY_PRICE: "", 
    ANCHOR_DAY: "", 
    BILLING_CYCLE: "", 
    CATEGORY: "",
  });

  // 💡 팝업이 열릴 때마다 입력창을 초기화해주는 안전장치 추가
  useEffect(() => {
    if (open) {
      setNewSub({ 
        username: username || "", 
        SERVICE_NM: "", 
        MONTHLY_PRICE: "", 
        ANCHOR_DAY: "", 
        BILLING_CYCLE: "", 
        CATEGORY: "" 
      });
    }
  }, [open, username]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = () => {
    const priceWithoutComma = newSub.MONTHLY_PRICE.replace(/,/g, "");
    onSave({ 
      ...newSub, 
      MONTHLY_PRICE: priceWithoutComma, 
      userName: username 
    });
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      fullWidth 
      maxWidth="xs" 
      PaperProps={{ sx: { borderRadius: "12px", padding: "10px" } }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>새로운 구독 추가</DialogTitle>
      
      <DialogContent dividers>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          
          {/* 1. 서비스 프리셋 선택 */}
          <TextField
            select
            label="서비스 빠른 선택"
            fullWidth
            value={PRESET_SERVICES.some(s => s.name === newSub.SERVICE_NM) ? newSub.SERVICE_NM : ''} 
            onChange={(e) => {
              const selected = PRESET_SERVICES.find(s => s.name === e.target.value);
              if (selected && selected.name !== "직접 입력") {
                setNewSub({ 
                  ...newSub, 
                  SERVICE_NM: selected.name,
                  MONTHLY_PRICE: selected.price.toLocaleString(), 
                  CATEGORY: selected.category
                });
              } else {
                setNewSub({ ...newSub, SERVICE_NM: "" });
              }
            }}
          >
            {PRESET_SERVICES.map((option) => (
              <MenuItem key={option.name} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </TextField>

          {/* 2. 서비스 이름 */}
          <TextField
            label="서비스 이름"
            fullWidth
            value={newSub.SERVICE_NM}
            onChange={(e) => setNewSub({...newSub, SERVICE_NM: e.target.value})}
          />

          {/* 3. 월 구독료 */}
          <TextField
            label="월 구독료"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>,
            }}
            value={newSub.MONTHLY_PRICE}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9]/g, "");
              const formattedValue = rawValue ? Number(rawValue).toLocaleString() : "";
              setNewSub({...newSub, MONTHLY_PRICE: formattedValue});
            }}
          />

          {/* 4. 정기 결제일 */}
          <TextField
            select
            label="정기 결제일"
            fullWidth
            value={newSub.ANCHOR_DAY || ''}
            onChange={(e) => setNewSub({...newSub, ANCHOR_DAY: e.target.value})}
            SelectProps={{
              MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } },
            }}
          >
            {DAYS.map((day) => (
              <MenuItem key={day} value={day}>
                {day === 31 ? "말일" : `${day}일`}
              </MenuItem>
            ))}
          </TextField>

          {/* 5. 결제 주기 */}
          <TextField
            select
            label="결제 주기"
            fullWidth
            value={newSub.BILLING_CYCLE || ''}
            onChange={(e) => setNewSub({...newSub, BILLING_CYCLE: e.target.value})}
            SelectProps={{
              MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } },
            }}
          >
            {CYCLES.map((cycle) => (
              <MenuItem key={cycle} value={cycle}>
                {cycle}개월
              </MenuItem>
            ))}
          </TextField>

          {/* 6. 카테고리 */}
          <TextField
            label="카테고리"
            fullWidth
            placeholder="OTT, 작업, 음악 등"
            value={newSub.CATEGORY}
            onChange={(e) => setNewSub({...newSub, CATEGORY: e.target.value})}
          />

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} color="inherit">취소</Button>
        <Button 
          onClick={handleSave}
          disabled={!newSub.SERVICE_NM || !newSub.MONTHLY_PRICE || !newSub.ANCHOR_DAY || !newSub.BILLING_CYCLE || !newSub.CATEGORY || isLoading}
          variant="contained" 
          sx={{ backgroundColor: '#000', '&:hover': { backgroundColor: '#333' } }}
        >
          저장하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSubModal;