import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Box, InputAdornment, Button, MenuItem, Chip 
} from "@mui/material";
import { DAYS, CYCLES } from '../utils/constants';

const EditSubModal = ({ 
  open, 
  editData, 
  setEditData, 
  oldEditData, 
  onClose, 
  onSave, 
  isLoading 
}) => {
  // 데이터가 없을 때 렌더링 에러 방지
  if (!editData || !oldEditData) return null;

  // 수정 날짜 형식 자동 하이픈 추가 핸들러 (YYYY-MM-DD)
  const handleDateChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
      .replace(/^(\d{4})(\d{2})$/, "$1-$2")
      .substring(0, 10);

    setEditData({ ...editData, NEXT_BILLING_DT: formattedValue });
  };

  // 날짜 입력 칸에서 포커스가 벗어났을 때 (원본 로직 그대로)
  const handleDateBlur = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) return;

    let year, month, day;

    if (value.length === 6) {
      year = parseInt("20" + value.slice(0, 2), 10);
      month = parseInt(value.slice(2, 4), 10);
      day = parseInt(value.slice(4, 6), 10);
    } else if (value.length === 8) {
      year = parseInt(value.slice(0, 4), 10);
      month = parseInt(value.slice(4, 6), 10);
      day = parseInt(value.slice(6, 8), 10);
    } else {
      const parts = e.target.value.split("-");
      if (parts.length !== 3) return;
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    }

    if (month > 12) month = 12;
    if (month < 1 || isNaN(month)) month = 1;

    const lastDayInMonth = new Date(year, month, 0).getDate();

    if (day > lastDayInMonth) day = lastDayInMonth;
    if (day < 1 || isNaN(day)) day = 1;

    const matchedAnchorDay = (day === lastDayInMonth) ? 31 : day;
    const finalDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    setEditData({ 
      ...editData, 
      NEXT_BILLING_DT: finalDate,
      ANCHOR_DAY: matchedAnchorDay 
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "12px", padding: "10px" }
      }}
    >
      <DialogTitle sx={{ fontWeight: 'bold' }}>게시글 수정 / 상세보기</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

          {/* 1. 서비스 이름 */}
          <TextField
            label="서비스 이름"
            fullWidth
            value={editData.SERVICE_NM || ''}
            onChange={(e) => setEditData({...editData, SERVICE_NM: e.target.value})}
          />

          {/* 2. 월 구독료 (천 단위 콤마 로직 추가) */}
          <TextField
            label="월 구독료"
            fullWidth
            InputProps={{
              endAdornment: <InputAdornment position="end">원</InputAdornment>,
            }}
            value={editData.MONTHLY_PRICE || ''}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/[^0-9]/g, "");
              const formattedValue = rawValue ? Number(rawValue).toLocaleString() : "";
              setEditData({...editData, MONTHLY_PRICE: formattedValue});
            }}
          />

          {/* 3. 결제 예정일 */}
          <TextField
            label="결제 예정일"
            fullWidth
            value={editData.NEXT_BILLING_DT || ''}
            placeholder="8자리 또는 6자리로 입력"
            onChange={handleDateChange}
            onBlur={handleDateBlur}
            inputProps={{ maxLength: 10 }}
          />

          {/* 4. 정기 결제일 (드롭다운) */}
          <TextField
            select
            label="정기 결제일"
            fullWidth
            value={editData.ANCHOR_DAY || ''}
            onChange={(e) => {
              const newAnchorDay = parseInt(e.target.value, 10);
              
              const baseDate = editData.NEXT_BILLING_DT ? new Date(editData.NEXT_BILLING_DT) : new Date();
              const year = baseDate.getFullYear();
              const month = baseDate.getMonth() + 1;

              const lastDayInMonth = new Date(year, month, 0).getDate();
              let targetDay = newAnchorDay;
              
              if (newAnchorDay === 31 || newAnchorDay > lastDayInMonth) {
                targetDay = lastDayInMonth;
              }

              const newDateStr = `${year}-${String(month).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;

              setEditData({
                ...editData,
                ANCHOR_DAY: newAnchorDay,
                NEXT_BILLING_DT: newDateStr
              });
            }}
            SelectProps={{
              MenuProps: { PaperProps: { style: { maxHeight: 200, width: 120 } } }
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
            value={editData.BILLING_CYCLE || ''}
            onChange={(e) => setEditData({...editData, BILLING_CYCLE: e.target.value})}
            SelectProps={{
              MenuProps: {
                PaperProps: {
                  style: { maxHeight: 200, width: 120 },
                },
              },
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
            value={editData.CATEGORY || ''}
            onChange={(e) => setEditData({...editData, CATEGORY: e.target.value})}
          />

          {/* 7. 상태 (드롭다운 + Chip 아이콘) */}
          <TextField
            select
            label="상태"
            fullWidth
            value={editData.USE_YN || 'Y'}
            onChange={(e) => setEditData({ ...editData, USE_YN: e.target.value })}
          >
            <MenuItem value="Y">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="사용 중" color="success" variant="outlined" size="small" sx={{ fontWeight: 'bold', cursor: 'pointer' }} />
              </Box>
            </MenuItem>
            <MenuItem value="N">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip label="만료됨" color="error" variant="outlined" size="small" sx={{ fontWeight: 'bold', cursor: 'pointer' }} />
              </Box>
            </MenuItem>
          </TextField>

          {/* 8. 생성일 */}
          <TextField
            label="생성일"
            disabled
            fullWidth
            value={editData.CREATE_DT || ''}
            onChange={(e) => setEditData({...editData, CREATE_DT: e.target.value})}
          />

          {/* 9. 수정일 */}
          <TextField
            label="수정일"
            disabled
            fullWidth
            value={editData.UPDATE_DT ? editData.UPDATE_DT : ''}
            onChange={(e) => setEditData({...editData, UPDATE_DT: e.target.value})}
          />

        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">닫기</Button>
        <Button
          onClick={() => {
            const priceValue = editData.MONTHLY_PRICE ? String(editData.MONTHLY_PRICE) : "0";
            const priceWithoutComma = priceValue.replace(/,/g, "");
            
            // onSave 프롭스를 통해 MainPage의 updateMutation 실행
            onSave({
              ...editData,
              MONTHLY_PRICE: priceWithoutComma,
              SEQ: editData.SEQ
            });
          }}
          disabled={
            isLoading ||
            (
              oldEditData.SERVICE_NM === editData.SERVICE_NM &&
              oldEditData.MONTHLY_PRICE === editData.MONTHLY_PRICE &&
              oldEditData.NEXT_BILLING_DT === editData.NEXT_BILLING_DT &&
              oldEditData.ANCHOR_DAY === editData.ANCHOR_DAY &&
              oldEditData.BILLING_CYCLE === editData.BILLING_CYCLE &&
              oldEditData.CATEGORY === editData.CATEGORY &&
              oldEditData.USE_YN === editData.USE_YN
            )
          }
          variant="contained" 
          sx={{ backgroundColor: '#000', '&:hover': { backgroundColor: '#333' } }}
        >
          저장하기
        </Button>
      </DialogActions>

    </Dialog>
  );
};

export default EditSubModal;