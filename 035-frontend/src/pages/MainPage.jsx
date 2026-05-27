import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi, insertSubApi, updateSubApi, selectcurnmApi } from "../api/mainpageApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField,
  Box,
  InputAdornment,
  Button, 
  IconButton, 
  Chip,
  TextField as MuiTextField,
  MenuItem
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { generateColors } from "../utils/constants";
import { useSubColumns } from "../hooks/useSubColumn";
import CreateSubModal from "../components/CreateSubModal";
import EditSubModal from "../components/EditSubModal";
import useDashboardStore from "../store/dashboardStore";

ChartJS.register(ArcElement, Tooltip, Legend);

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  
  // [수정된 부분] 백엔드 조회 시 사용할 userId 변수를 명시적으로 선언합니다.
  const userId = user?.id;
  // [수정된 부분] 끝

  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [oldEditData, setOldEditData] = useState(null);

  const [openCreate, setOpenCreate] = useState(false);

  const generateColors = (count) => {
    return Array.from({ length: count }, (_, i) => {
      const hue = (i * (360 / count)) % 360;
      return `hsl(${hue}, 70%, 60%)`; 
    });
  };

  const [newSub, setNewSub] = useState({
    username: "",
    SERVICE_NM: "",
    MONTHLY_PRICE: "",
    ANCHOR_DAY: "",
    BILLING_CYCLE: "",
    CATEGORY: "",
  });

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

  const { data: curNMData = [] } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
    refetchOnWindowFocus: false,
  });
  const currencies = Array.isArray(curNMData) ? curNMData : (curNMData?.result || []);
  const prefCurrency = localStorage.getItem("prefCurrency") || "KRW";

  const columns = [
    { field: "SEQ", headerName: "seq", width: 20, align: "center", headerAlign: "center" },
    { 
      field: "display_id", 
      headerName: "No.", 
      width: 50, 
      align: "center", 
      headerAlign: "center",
      sortable: false, 
      renderCell: (params) => {
        const rowIndex = params.api.getRowIndexRelativeToVisibleRows(params.id);
        return <span>{rowIndex + 1}</span>;
      }
    },
    { field: "SERVICE_NM", headerName: "서비스 이름", width: 200, flex: 1, editable: true, headerAlign: "center", align: "center" },
    { 
      field: "MONTHLY_PRICE", 
      headerName: "구독료", 
      width: 100, 
      editable: false, 
      headerAlign: "center", 
      align: "center",
      renderCell: (params) => {
        const price = params.row.MONTHLY_PRICE;
        const displayCurrency = params.row.CURRENCY || "KRW";
        const currencySuffix = displayCurrency === "KRW" ? "원" : displayCurrency;
        
        if (!price) return `0 ${currencySuffix}`;
        return `${Number(price).toLocaleString()} ${currencySuffix}`;
      }
    },
    { field: "NEXT_BILLING_DT", headerName: "결제 예정일", width: 100, editable: false, headerAlign: "center", align: "center" },
    { 
      field: "ANCHOR_DAY", 
      headerName: "결제일", 
      width: 90, 
      editable: false, 
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
      editable: false, 
      headerAlign: "center", 
      align: "center",
      valueFormatter: (value) => (value ? `${value}개월` : "-")
    },
    { field: "CATEGORY", headerName: "카테고리", width: 100, editable: false, headerAlign: "center", align: "center" },
    { 
      field: "USE_YN", 
      headerName: "상태", 
      width: 90, 
      editable: false, 
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
      renderCell: (params) => {
        return (
          <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(params.row); }}
          sx={{
            transition: 'color 0.2s', 
            '&:hover': {
              color: '#d32f2f', 
              backgroundColor: 'rgba(211, 47, 47, 0.04)', 
            },
          }}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        );
      },
    }
  ];

  /* --------------------------------------------------------------------------------
   월간 구독 금액, 구독 수 조회
  -------------------------------------------------------------------------------- */
  const { data: sumData = [], isLoading: isSumLoading, refetch: refetchSum, isFetching: isSumFetching } = useQuery(
    {
      // [수정된 부분] userName 대신 userId로 파라미터를 통일하여 백엔드 조회 불가 현상을 해결했습니다.
      queryKey: ["selectsum", userId],
      queryFn: () => selectsumApi({ userId: userId }),
      enabled: !!userId, 
      // [수정된 부분] 끝
      refetchOnWindowFocus: false,
    }
  );
  const sumresult = sumData?.result?.[0] || { sum: 0, count: 0 };
  
  let displayedSum = sumresult.sum || 0;
  if (prefCurrency !== "KRW" && currencies.length > 0) {
    const targetCur = currencies.find((c) => c.currency === prefCurrency);
    const targetRate = targetCur?.exchange_rate ? Number(targetCur.exchange_rate) : 1;
    if (targetRate > 0) {
      displayedSum = Math.floor((displayedSum / targetRate) * 100) / 100;
    }
  }

  /* --------------------------------------------------------------------------------
   결제 예정일 조회
  -------------------------------------------------------------------------------- */
    const { data: dateData = [], isLoading: isdateLoading, refetch: refetchDate, isFetching: isDateFetching } = useQuery(
    {
      // [수정된 부분] userName 대신 userId 파라미터 전송
      queryKey: ["selectdate", userId],
      queryFn: () => selectdateApi({ userId: userId }),
      enabled: !!userId, 
      // [수정된 부분] 끝
      refetchOnWindowFocus: false,
    }
  );
  const dateresult = dateData?.result?.[0] || { NEXT_BILLING_DT: 0, SERVICE_NM: 0 };

  /* --------------------------------------------------------------------------------
   구독 목록 리스트 조회
  -------------------------------------------------------------------------------- */
    const { data: subListData = [], isLoading: issubListLoading, refetch: refetchSubList, isFetching: isSubListFetching } = useQuery(
    {
      // [수정된 부분] userName 대신 userId 파라미터 전송
      queryKey: ["selectsublist", userId],
      queryFn: () => selectsublistApi({ userId: userId }),
      enabled: !!userId, 
      // [수정된 부분] 끝
      refetchOnWindowFocus: false,
    }
  );
  
  // [수정된 부분] filter 함수에서 배열이 아닌 객체가 전달될 경우 발생하는 에러를 방지하기 위해 배열 여부 검사 추가
  const safeSubListData = Array.isArray(subListData) ? subListData : (subListData?.result || []);
  // [수정된 부분] 끝

  /* --------------------------------------------------------------------------------
   지출 차트 조회
  -------------------------------------------------------------------------------- */
    const { data: subchartData = [], isLoading: issubchartLoading, refetch: refetchSubChart, isFetching: isSubChartFetching } = useQuery(
    {
      // [수정된 부분] userName 대신 userId 파라미터 전송
      queryKey: ["selectsubchart", userId],
      queryFn: () => selectsubchartApi({ userId: userId }),
      enabled: !!userId,
      // [수정된 부분] 끝
      refetchOnWindowFocus: false,
    }
  );
  const chartResult = subchartData?.result || [];

  const handleDelete = (row) => {
    if (window.confirm(`"${row.SERVICE_NM}" 서비스를 삭제하시겠습니까?`)) {
      deleteSubApi({ seq: row.SEQ }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["selectsum"] });
        queryClient.invalidateQueries({ queryKey: ["selectdate"] });
        queryClient.invalidateQueries({ queryKey: ["selectsublist"] });
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: insertSubApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["selectsum"] });
      queryClient.invalidateQueries({ queryKey: ["selectdate"] });
      queryClient.invalidateQueries({ queryKey: ["selectsublist"] });
      queryClient.invalidateQueries({ queryKey: ["selectsubchart"] });
      setOpenCreate(false);
      alert("생성되었습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSubApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["selectsum"] });
      queryClient.invalidateQueries({ queryKey: ["selectdate"] });
      queryClient.invalidateQueries({ queryKey: ["selectsublist"] });
      queryClient.invalidateQueries({ queryKey: ["selectsubchart"] });
      setOpenEdit(false);
      alert("수정되었습니다.");
    },
  });

  const handleCellClick = (params) => {
    if (params.field === 'actions') return;
    setEditData(params.row);
    setOpenEdit(true);
  };

  const chartDataValues = chartResult.map(item => {
    let val = item.TOTAL_PRICE || 0;
    if (prefCurrency !== "KRW" && currencies.length > 0) {
      const targetCur = currencies.find((c) => c.currency === prefCurrency);
      const targetRate = targetCur?.exchange_rate ? Number(targetCur.exchange_rate) : 1;
      if (targetRate > 0) {
        val = Math.floor((val / targetRate) * 100) / 100;
      }
    }
    return val;
  });

  const data = {
    labels: chartResult.map(item => item.CATEGORY),
    datasets: [
      {
        label: '구독 지출',
        data: chartDataValues,
        backgroundColor: generateColors(chartResult.length),
        borderWidth: 1,
        cutout: '70%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, 
    plugins: {
      legend: {
        position: 'bottom', 
        labels: {
          usePointStyle: true, 
          padding: 20,
        },
      },
      tooltip: {
        enabled: true, 
        callbacks: {
          label: (context) => {
            return ` ${context.parsed.toLocaleString()} ${prefCurrency === "KRW" ? "원" : prefCurrency}`;
          }
        }
      },
    },
  };

  const handleClose = () => {
    setOpenCreate(false);
    setNewSub({ 
      username: "",
      SERVICE_NM: "",
      MONTHLY_PRICE: "",
      ANCHOR_DAY: "",
      BILLING_CYCLE: "",
      CATEGORY: "", 
    }); 
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setTimeout(() => setEditData(null), 200); 
  };

  const handleDateChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    const formattedValue = value
      .replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")
      .replace(/^(\d{4})(\d{2})$/, "$1-$2")
      .substring(0, 10);

    setEditData({ ...editData, NEXT_BILLING_DT: formattedValue });
  };

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

  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const { widgets, setWidgets, toggleWidget } = useDashboardStore();

  const handleDragStart = (e, id) => {
    if (!isEditMode) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    setTimeout(() => e.target.style.opacity = '0.5', 0);
  };

  const handleDragEnter = (e, targetId) => {
    e.preventDefault();
    if (!isEditMode || !draggedId || draggedId === targetId) return;

    const draggedIndex = widgets.findIndex((w) => w.id === draggedId);
    const targetIndex = widgets.findIndex((w) => w.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newWidgets = [...widgets];
    const [draggedItem] = newWidgets.splice(draggedIndex, 1);
    newWidgets.splice(targetIndex, 0, draggedItem);
    
    setWidgets(newWidgets);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedId(null);
  };

  const handleDragOver = (e) => {
    if (!isEditMode) return;
    e.preventDefault(); 
  };

  const handleDrop = (e, targetId) => {
    if (!isEditMode) return;
    e.preventDefault();
    setDraggedId(null);
  };

  const renderWidget = (widget) => {
    if (!widget.visible) return null;

    let content = null;
    switch (widget.id) {
      case 'totalAmount':
        content = (
          <div className={styles.summaryCardInner}>
            <p className={styles.summaryLabel}>활성화된 총 구독 금액</p>
            <p className={styles.summaryValue}>{displayedSum.toLocaleString()} {prefCurrency === "KRW" ? "원" : prefCurrency}</p>
          </div>
        );
        break;
      case 'activeCount':
        content = (
          <div className={styles.summaryCardInner}>
            <p className={styles.summaryLabel}>활성화된 구독 수</p>
            <p className={styles.summaryValue}>{sumresult.count || 0}개</p>
          </div>
        );
        break;
      case 'nextBilling':
        content = (
          <div className={styles.summaryCardInner}>
            <p className={styles.summaryLabel}>다음 결제 예정</p>
            <p className={styles.summaryValue}>
              {dateresult.NEXT_BILLING_DT ? `${dateresult.SERVICE_NM} - ${dateresult.NEXT_BILLING_DT}` : '정보 없음'}
            </p>
          </div>
        );
        break;
      case 'subList':
        content = (
          <div className={styles.listContainerInner}>
            <div className={styles.listHeader}>
              <h4>내 구독 목록</h4>
              <div className={styles.buttonGroup}>
                <TextField 
                  size="small" variant="outlined" placeholder="서비스 이름 검색..." 
                  value={searchText} onChange={(e) => setSearchText(e.target.value)} 
                  InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#999' }} /></InputAdornment>) }}
                  sx={{ width: '220px', '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '36px'} }}
                />
                <Button variant="outlined" size="small" onClick={() => refetchSubList()} sx={{ borderRadius: '8px', height: '36px', textTransform: 'none', borderColor: '#e5e7eb', color: '#666', minWidth: '80px' }}>새로고침</Button>
                <button className={styles.addButton} onClick={() => setOpenCreate(true)}><span style={{ marginRight: '4px' }}>+</span> 추가</button>

                <CreateSubModal 
                  open={openCreate} 
                  onClose={() => setOpenCreate(false)} 
                  onSave={(data) => createMutation.mutate(data)}
                  isLoading={createMutation.isPending}
                  existingSubscriptions={safeSubListData}
                />
                
                <EditSubModal 
                  open={openEdit} 
                  editData={editData}
                  onClose={handleCloseEdit} 
                  // [수정된 부분] userName 대신 userId 매핑
                  onSave={(data) => updateMutation.mutate({ ...data, userId: userId })}
                  // [수정된 부분] 끝
                  isLoading={updateMutation.isPending}
                />
              </div>
            </div>
            
            <div className={styles.tablePlaceholder}>
              <DataGrid 
                // [수정된 부분] undefined 에러 방지를 위해 안전한 배열(safeSubListData) 사용 
                rows={safeSubListData.filter(row => row.SERVICE_NM.toLowerCase().includes(searchText.toLowerCase()))} 
                // [수정된 부분] 끝
                getRowId={(row) => row.SEQ} 
                columns={columns} 
                onCellClick={handleCellClick}
                loading={issubListLoading} 
                sx={{ cursor: 'pointer' }}
                initialState={{ columns: { columnVisibilityModel: { SEQ: false } } }}
              />
            </div>
          </div>
        );
        break;
      case 'chartArea':
        content = (
          <div className={styles.chartCardInner}>
            <h4>활성화된 구독 지출 분포</h4>
            <div style={{ flex: 1, minHeight: 0, marginTop: '20px' }}>
              {chartResult.length > 0 ? (
                <Doughnut data={data} options={options} />
              ) : (
                <div className={styles.noData}>
                  <p>등록된 구독 내역이 없습니다.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>새로운 구독을 추가해 보세요!</p>
                </div>
              )}
            </div>
          </div>
        );
        break;
      case 'activityArea':
        content = (
          <div className={styles.activityCardInner}>
            <h4>최근 활동 및 알림</h4>
            <div className={styles.activityList}>
              <p>뭘 적는게 좋을까요?</p>
              <p>구독 추가/수정/삭제 시 알림이 뜨면 좋을 것 같은데, 일단은 고정된 문구로 넣어봤습니다.</p>
              <p>위 문구는 자동완성 입니다.</p>
            </div>
          </div>
        );
        break;
      default:
        return null;
    }

    return (
      <div
        key={widget.id}
        className={`${styles.card} ${styles[widget.type]} ${draggedId === widget.id ? styles.dragging : ''}`}
        draggable={isEditMode}
        onDragStart={(e) => handleDragStart(e, widget.id)}
        onDragEnter={(e) => handleDragEnter(e, widget.id)}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, widget.id)}
      >
        {isEditMode && (
          <button className={styles.closeWidgetBtn} onClick={() => toggleWidget(widget.id)} title="위젯 숨기기">
            ✕
          </button>
        )}
        {content}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.header}>
          <h2>안녕하세요, {user?.username}님!</h2>
          <p style={{color: '#817d7d'}}>이번 달 구독 내역을 확인해 보세요.</p>
        </div>

        <div className={styles.editControls}>
          {widgets.some(w => !w.visible) && (
            <div className={styles.hiddenWidgets}>
              {widgets.filter(w => !w.visible).map(w => (
                <button key={w.id} className={styles.restoreBtn} onClick={() => toggleWidget(w.id)}>
                  + {w.title}
                </button>
              ))}
            </div>
          )}
          <Button 
            variant={isEditMode ? "contained" : "outlined"} 
            color={isEditMode ? "primary" : "inherit"}
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? "편집 완료" : "대시보드 편집"}
          </Button>
        </div>
      </div>

      <div className={`${styles.dashboardGrid} ${isEditMode ? styles.editing : ''}`}>
        {widgets.map(renderWidget)}
      </div>
    </div>
  );
};

export default MainPage;