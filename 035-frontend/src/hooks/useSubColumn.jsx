import { useMemo } from 'react';
import { Chip, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export const useSubColumns = (handleDelete) => {
  return useMemo(() => [
    { field: "SEQ", headerName: "seq", width: 20, align: "center", headerAlign: "center" },
    { 
      field: "display_id", 
      headerName: "No.", 
      width: 50, 
      align: "center", 
      headerAlign: "center",
      sortable: false, 
      renderCell: (params) => params.api.getRowIndexRelativeToVisibleRows(params.id) + 1
    },
    { field: "SERVICE_NM", headerName: "서비스 이름", width: 200, flex: 1, headerAlign: "center", align: "center" },
    { 
      field: "MONTHLY_PRICE", 
      headerName: "구독료", 
      width: 100, 
      headerAlign: "center", 
      align: "center",
      valueFormatter: (value) => value ? `${value.toLocaleString()}원` : "0원"
    },
    { 
      field: "ANCHOR_DAY", 
      headerName: "결제일", 
      width: 90, 
      headerAlign: "center", 
      align: "center",
      valueFormatter: (value) => {
        if (!value) return "-";
        return value === 31 || value === "31" ? "매월 말일" : `매월 ${value}일`;
      }
    },
    { 
      field: "BILLING_CYCLE", 
      headerName: "결제 주기", 
      width: 90, 
      headerAlign: "center", 
      align: "center",
      valueFormatter: (value) => (value ? `${value}개월` : "-")
    },
    { field: "CATEGORY", headerName: "카테고리", width: 100, headerAlign: "center", align: "center" },
    { 
      field: "USE_YN", 
      headerName: "상태", 
      width: 90,
      headerAlign: "center", 
      align: "center",
      renderCell: (params) => {
        const isActive = params.value === 'Y' || params.value === '사용중';
        return (
          <Chip 
            label={isActive ? '사용 중' : '만료됨'} 
            color={isActive ? 'success' : 'error'} 
            variant="outlined" 
            size="small"
            sx={{ fontWeight: 'bold' }} 
          />
        );
      }
    },
    { field: "CREATE_DT", headerName: "생성일", width: 150, align: "center", headerAlign: "center" },
    { field: "UPDATE_DT", headerName: "수정일", width: 150, align: "center", headerAlign: "center" },
    {
      field: "actions",
      headerName: "삭제",
      width: 70,
      sortable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(params.row); }}
          sx={{ transition: 'color 0.2s', '&:hover': { color: '#d32f2f', backgroundColor: 'rgba(211, 47, 47, 0.04)' } }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    }
  ], [handleDelete]); // handleDelete가 바뀔 때만 재연산
};