import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, Box, InputAdornment, Button, MenuItem, Chip } from "@mui/material";
import { DAYS, CYCLES } from '../utils/constants';

const EditSubModal = ({ open, editData, onClose, onSave, isLoading }) => {
  // [Refactor] 상위 컴포넌트 렌더링 방지를 위한 로컬 상태 도입
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (editData && open) {
      // 숫자 금액에 콤마 처리
      const formattedPrice = editData.MONTHLY_PRICE ? Number(editData.MONTHLY_PRICE).toLocaleString() : "";
      setFormData({ ...editData, MONTHLY_PRICE: formattedPrice, SHARED_USERS: 1 });
    }
  }, [editData, open]);

  if (!formData) return null;

  const handleDateChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
      .replace(/^(\d{4})(\d{2})$/, "$1-$2")
      .substring(0, 10);
    setFormData({ ...formData, NEXT_BILLING_DT: formattedValue });
  };

  const handleDateBlur = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) return;

    // ... (기존 날짜 파싱 로직 동일)
    let year, month, day;
    if (value.length === 6) { year = parseInt("20" + value.slice(0, 2), 10); month = parseInt(value.slice(2, 4), 10); day = parseInt(value.slice(4, 6), 10); } 
    else if (value.length === 8) { year = parseInt(value.slice(0, 4), 10); month = parseInt(value.slice(4, 6), 10); day = parseInt(value.slice(6, 8), 10); } 
    else { const parts = e.target.value.split("-"); if (parts.length !== 3) return; year = parseInt(parts[0], 10); month = parseInt(parts[1], 10); day = parseInt(parts[2], 10); }

    if (month > 12) month = 12; if (month < 1 || isNaN(month)) month = 1;
    const lastDayInMonth = new Date(year, month, 0).getDate();
    if (day > lastDayInMonth) day = lastDayInMonth; if (day < 1 || isNaN(day)) day = 1;

    const matchedAnchorDay = (day === lastDayInMonth) ? 31 : day;
    const finalDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setFormData({ ...formData, NEXT_BILLING_DT: finalDate, ANCHOR_DAY: matchedAnchorDay });
  };

  const { SHARED_USERS, ...compareData } = formData;
  const isUnchanged = JSON.stringify({ ...editData, MONTHLY_PRICE: editData?.MONTHLY_PRICE?.toLocaleString() || "" }) === JSON.stringify(compareData) && (SHARED_USERS === 1 || !SHARED_USERS);

  const handleSaveClick = () => {
    const priceWithoutComma = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    const finalPrice = Math.floor(priceWithoutComma / users);

    onSave({ ...compareData, MONTHLY_PRICE: finalPrice });
  };

  const getCalculatedPrice = () => {
    const price = Number(String(formData.MONTHLY_PRICE).replace(/,/g, ""));
    const users = Number(formData.SHARED_USERS) || 1;
    return price > 0 && users > 1 ? Math.floor(price / users).toLocaleString() : "";
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

          <TextField select label="결제 주기" fullWidth value={formData.BILLING_CYCLE || ''} onChange={(e) => setFormData({...formData, BILLING_CYCLE: e.target.value})} SelectProps={{ MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } } }}>
            {CYCLES.map((cycle) => (<MenuItem key={cycle} value={cycle}>{cycle}개월</MenuItem>))}
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
        <Button onClick={handleSaveClick} disabled={isLoading || isUnchanged} variant="contained" sx={{ backgroundColor: '#3b82f6', '&:hover': { backgroundColor: '#2563eb' } }}>
          저장하기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditSubModal;