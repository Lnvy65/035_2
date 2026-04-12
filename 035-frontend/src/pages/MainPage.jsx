import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi, insertSubApi, updateSubApi } from "../api/mainpageApi";
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
import { create } from "zustand";

ChartJS.register(ArcElement, Tooltip, Legend);

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  // 수정 팝업 및 데이터 관리를 위한 State 추가
  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [oldEditData, setOldEditData] = useState(null);

  // 생성 팝업 및 데이터 관리를 위한 State 추가
  const [openCreate, setOpenCreate] = useState(false);

  // 차트 색상 팔레트 (필요에 따라 추가/수정 가능)
  const generateColors = (count) => {
    return Array.from({ length: count }, (_, i) => {
      const hue = (i * (360 / count)) % 360;
      return `hsl(${hue}, 70%, 60%)`; // 채도 70%, 명도 60%로 일관성 유지
    });
  };

  // 신규 등록을 위한 임시 상태
  const [newSub, setNewSub] = useState({
    username: "",
    SERVICE_NM: "",
    MONTHLY_PRICE: "",
    ANCHOR_DAY: "",
    BILLING_CYCLE: "",
    CATEGORY: "",
  });

  // 서비스별 기본 가격 정보
  const PRESET_SERVICES = [
    { name: "YouTube Premium", price: 14900, category: "OTT" },
    { name: "Netflix", price: 17000, category: "OTT" },
    { name: "Spotify", price: 10900, category: "음악" },
    { name: "Disney+", price: 9900, category: "OTT" },
    { name: "Coupang Wow", price: 7890, category: "쇼핑" },
    { name: "직접 입력", price: "", category: "" },
  ];

  // 1~31일 배열 생성
  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

  // 결제 주기 배열 생성
  const CYCLES = [1, 3, 6, 12];

  /* --------------------------------------------------------------------------------
   columns
  -------------------------------------------------------------------------------- */
  const columns = [
    { field: "SEQ", headerName: "seq", width: 20, align: "center", headerAlign: "center" },
    { 
      field: "display_id", // 필드명을 SEQ와 다르게 주어 혼동을 방지합니다.
      headerName: "No.", 
      width: 50, // 번호가 세 자릿수가 될 수 있으니 여유를 좀 줍니다.
      align: "center", 
      headerAlign: "center",
      sortable: false, // 단순 순번이므로 정렬 기능은 끄는 게 자연스럽습니다.
      renderCell: (params) => {
        // 현재 행의 인덱스를 가져와서 1부터 시작하게 만듭니다.
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
      valueFormatter: (value) => {
        if (!value) return "0원";
        return `${value.toLocaleString()}원`;
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
      width: 90, // Chip이 들어가므로 너비를 조금 넓혔습니다.
      editable: false, 
      headerAlign: "center", 
      align: "center",
      renderCell: (params) => {
        // 데이터가 'Y' 또는 '사용중'인 경우를 체크
        const isActive = params.value === 'Y' || params.value === '사용중';
        
        return (
          <Chip 
            label={isActive ? '사용 중' : '만료됨'} 
            color={isActive ? 'success' : 'error'} 
            variant="outlined" 
            size="small"
            sx={{ fontWeight: 'bold' }} // 가독성을 위해 추가
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
            transition: 'color 0.2s', // 부드러운 색상 변경
            '&:hover': {
              color: '#d32f2f', // 마우스를 올렸을 때 빨간색 (MUI 기본 에러 색상)
              backgroundColor: 'rgba(211, 47, 47, 0.04)', // 살짝 붉은 잔상 효과 (선택사항)
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
      queryKey: ["selectsum", user?.username],
      queryFn: () => selectsumApi({ userName: user?.username }),
      enabled: !!user?.username, // userName이 있을 때만 쿼리 실행
      refetchOnWindowFocus: false,
    }
  );
  const sumresult = sumData?.result?.[0] || { sum: 0, count: 0 };


  /* --------------------------------------------------------------------------------
   결제 예정일 조회
  -------------------------------------------------------------------------------- */
    const { data: dateData = [], isLoading: isdateLoading, refetch: refetchDate, isFetching: isDateFetching } = useQuery(
    {
      queryKey: ["selectdate", user?.username],
      queryFn: () => selectdateApi({ userName: user?.username }),
      enabled: !!user?.username, // userName이 있을 때만 쿼리 실행
      refetchOnWindowFocus: false,
    }
  );
  const dateresult = dateData?.result?.[0] || { NEXT_BILLING_DT: 0, SERVICE_NM: 0 };


  /* --------------------------------------------------------------------------------
   결제 예정일 조회
  -------------------------------------------------------------------------------- */
    const { data: subListData = [], isLoading: issubListLoading, refetch: refetchSubList, isFetching: isSubListFetching } = useQuery(
    {
      queryKey: ["selectsublist", user?.username],
      queryFn: () => selectsublistApi({ userName: user?.username }),
      enabled: !!user?.username, // userName이 있을 때만 쿼리 실행
      refetchOnWindowFocus: false,
    }
  );


  /* --------------------------------------------------------------------------------
   지출 차트 조회
  -------------------------------------------------------------------------------- */
    const { data: subchartData = [], isLoading: issubchartLoading, refetch: refetchSubChart, isFetching: isSubChartFetching } = useQuery(
    {
      queryKey: ["selectsubchart", user?.username],
      queryFn: () => selectsubchartApi({ userName: user?.username }),
      enabled: !!user?.username,
      refetchOnWindowFocus: false,
    }
  );
  const chartResult = subchartData?.result || [];


  /* --------------------------------------------------------------------------------
   삭제
  -------------------------------------------------------------------------------- */
  const handleDelete = (row) => {
    if (window.confirm(`"${row.SERVICE_NM}" 서비스를 삭제하시겠습니까?`)) {
      deleteSubApi({ seq: row.SEQ }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["selectsum"] });
        queryClient.invalidateQueries({ queryKey: ["selectdate"] });
        queryClient.invalidateQueries({ queryKey: ["selectsublist"] });
      });
    }
  };


  /* --------------------------------------------------------------------------------
   생성
  -------------------------------------------------------------------------------- */
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

  /* --------------------------------------------------------------------------------
   수정
  -------------------------------------------------------------------------------- */
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


  /* --------------------------------------------------------------------------------
    수정화면팝업 핸들러
  -------------------------------------------------------------------------------- */  
  const handleCellClick = (params) => {
    // 1. 삭제 버튼(actions) 클릭 시에는 로직 방지 (이미 IconButton에서 e.stopPropagation 처리됨)
    if (params.field === 'actions') return;

    // 2. 그 외의 컬럼(제목, 내용 등) 클릭 시 수정/상세 팝업 오픈
    setEditData({ ...params.row });
    setOldEditData({ ...params.row }); // 수정 전 데이터 저장
    setOpenEdit(true);
  };



  /* --------------------------------------------------------------------------------
    도넛 차트
  -------------------------------------------------------------------------------- */  
  const data = {
    // labels: ['work', 'OTT', 'music'] 형태의 배열 생성
    labels: chartResult.map(item => item.CATEGORY),
    datasets: [
      {
        label: '구독 지출',
        data: chartResult.map(item => item.TOTAL_PRICE),
        backgroundColor: generateColors(chartResult.length),
        borderWidth: 1,
        cutout: '70%',
      },
    ],
  };


  const options = {
    responsive: true,
    maintainAspectRatio: false, // 컨테이너 크기에 맞춤
    plugins: {
      legend: {
        position: 'bottom', // 범례 위치 (top, bottom, left, right)
        labels: {
          usePointStyle: true, // 범례 모양을 원형으로
          padding: 20,
        },
      },
      tooltip: {
        enabled: true, // 마우스 호버 시 툴팁 표시
      },
    },
  };

  // 팝업 닫기 핸들러
  const handleClose = () => {
    setOpenCreate(false);
    setNewSub({ 
      username: "",
      SERVICE_NM: "",
      MONTHLY_PRICE: "",
      ANCHOR_DAY: "",
      BILLING_CYCLE: "",
      CATEGORY: "", 
    }); // 입력폼 초기화
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setEditData(null); // 수정 데이터 초기화
    setOldEditData(null); // 수정 전 데이터 초기화
  };


  return (
    <div className={styles.container}>
      
      {/* 1. 상단 타이틀 구역 */}
      <div className={styles.header}>
        <h2>안녕하세요, {user?.username}님!</h2>
        <p style={{color: '#817d7d'}}>이번 달 구독 내역을 확인해 보세요.</p>
      </div>

      {/* 2. 상단 요약 카드 3개 */}
      <div className={styles.summarySection}>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          {/* 총 금액 박스 */}
          <p style={{color: '#817d7d'}}>활성화된 총 구독 금액</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{sumresult.sum ? sumresult.sum.toLocaleString() : 0}원</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          {/* 구독 수 박스 */}
          <p style={{color: '#817d7d'}}>활성화된 구독 수</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{sumresult.count || 0}개</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          {/* 다음 결제 예정 박스 */}
          <p style={{color: '#817d7d'}}>다음 결제 예정</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{dateresult.NEXT_BILLING_DT && dateresult.SERVICE_NM ? `${dateresult.SERVICE_NM} - ${dateresult.NEXT_BILLING_DT}` : '정보 없음'}</p>
        </div>
      </div>

      {/* 3. 하단 메인 본문 */}
      <div className={styles.mainContent}>
        
        {/* 왼쪽: 내 구독 목록 */}
        <div className={`${styles.card} ${styles.listContainer}`}>
            <div className={styles.listHeader}>
            <h4>내 구독 목록</h4>
            <div className={styles.buttonGroup}>
              <TextField 
                size="small" 
                variant="outlined"
                placeholder="서비스 이름 검색..." 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)} // 실시간 검색
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#999' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  width: '220px',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    height: '36px',
                    backgroundColor: '#fff'
                  }
                }}
              />
              
              <Button 
                variant="outlined" 
                size="small" 
                onClick={refetchSubList}
                sx={{ 
                  borderRadius: '8px', 
                  height: '36px', 
                  textTransform: 'none',
                  borderColor: '#e5e7eb',
                  color: '#666',
                  minWidth: '80px'
                }}
              >
                새로고침
              </Button>

              <button className={styles.addButton} onClick={() => setOpenCreate(true)}>
                <span style={{ marginRight: '4px' }}>+</span> 추가
              </button>

              {/* --------------------------------------------------------------------------
                생성 화면 팝업
              -------------------------------------------------------------------------- */}
              <Dialog 
                open={openCreate}
                onClose={handleClose} // 바탕 클릭 시 자동으로 닫힘
                fullWidth 
                maxWidth="xs"
                PaperProps={{
                  sx: { borderRadius: "12px", padding: "10px" }
                }}
              >
                <DialogTitle sx={{ fontWeight: 'bold' }}>
                  새로운 구독 추가
                </DialogTitle>
                
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
                          // '직접 입력' 선택 시 서비스 이름만 비워주거나 유지
                          setNewSub({ ...newSub, SERVICE_NM: "" });
                        }
                      }}
                    >
                      {/* MenuItem 부분은 동일 */}
                      {PRESET_SERVICES.map((option) => (
                        <MenuItem key={option.name} value={option.name}>
                          {option.name}
                        </MenuItem>
                      ))}
                    </TextField>


                    {/* 2. 서비스 이름 (수동 입력 가능) */}
                    <TextField
                      label="서비스 이름"
                      fullWidth
                      value={newSub.SERVICE_NM}
                      onChange={(e) => setNewSub({...newSub, SERVICE_NM: e.target.value})}
                    />


                    {/* 3. 월 구독료 (천 단위 콤마 로직 추가) */}
                    <TextField
                      label="월 구독료"
                      fullWidth
                      InputProps={{
                        endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      }}
                      value={newSub.MONTHLY_PRICE}
                      onChange={(e) => {
                        // 숫자만 남기기
                        const rawValue = e.target.value.replace(/[^0-9]/g, "");
                        // 콤마 추가
                        const formattedValue = rawValue ? Number(rawValue).toLocaleString() : "";
                        setNewSub({...newSub, MONTHLY_PRICE: formattedValue});
                      }}
                    />


                    {/* 4. 정기 결제일 (드롭다운) */}
                    <TextField
                      select
                      label="정기 결제일"
                      fullWidth // 또는 sx={{ width: '150px' }}
                      value={newSub.ANCHOR_DAY || ''}
                      onChange={(e) => setNewSub({...newSub, ANCHOR_DAY: e.target.value})
                      }
                      SelectProps={{
                        MenuProps: {
                          PaperProps: {
                            style: {
                              maxHeight: 200, // 픽셀 단위로 높이 제한 (약 5~6개 항목 노출)
                              width: 120,     // 드롭다운 펼쳐졌을 때의 너비도 조절 가능
                            },
                          },
                        },
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
                      fullWidth // 또는 sx={{ width: '150px' }}
                      value={newSub.BILLING_CYCLE || ''}
                      onChange={(e) => setNewSub({...newSub, BILLING_CYCLE: e.target.value})}
                      SelectProps={{
                        MenuProps: {
                          PaperProps: {
                            style: {
                              maxHeight: 200, // 픽셀 단위로 높이 제한 (약 5~6개 항목 노출)
                              width: 120,     // 드롭다운 펼쳐졌을 때의 너비도 조절 가능
                            },
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
                      value={newSub.CATEGORY}
                      onChange={(e) => setNewSub({...newSub, CATEGORY: e.target.value})
                      }
                    />

                  </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={handleClose} color="inherit">취소</Button>
                  <Button 
                    onClick={() => {
                      const priceWithoutComma = newSub.MONTHLY_PRICE.replace(/,/g, "");
                      createMutation.mutate({
                        ...newSub, 
                        MONTHLY_PRICE: priceWithoutComma, // 숫자 형태의 문자열로 전송
                        userName: user.username
                      });
                    }}
                    disabled={!newSub.SERVICE_NM || !newSub.MONTHLY_PRICE || !newSub.ANCHOR_DAY || !newSub.BILLING_CYCLE || !newSub.CATEGORY || createMutation.isLoading}
                    variant="contained" 
                    sx={{ backgroundColor: '#000', '&:hover': { backgroundColor: '#333' } }}
                  >
                    저장하기
                  </Button>
                </DialogActions>
              </Dialog>
              {/* --------------------------------------------------------------------------
                생성 화면 팝업
              -------------------------------------------------------------------------- */}


              {/* --------------------------------------------------------------------------
                수정 화면 팝업
              -------------------------------------------------------------------------- */}
              <Dialog
                open={openEdit}
                onClose={handleCloseEdit}
                maxWidth="xs"
                fullWidth
                PaperProps={{
                  sx: { borderRadius: "12px", padding: "10px" }
                }}
              >
                <DialogTitle sx={{ fontWeight: 'bold' }}>게시글 수정 / 상세보기</DialogTitle>
                <DialogContent dividers>
                  {editData && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>

                      {/* 1. 서비스 이름 */}
                      <TextField
                        label="서비스 이름"
                        fullWidth
                        value={editData.SERVICE_NM}
                        onChange={(e) => setEditData({...editData, SERVICE_NM: e.target.value})}
                      />

                      {/* 2. 월 구독료 (천 단위 콤마 로직 추가) */}
                      <TextField
                        label="월 구독료"
                        fullWidth
                        InputProps={{
                          endAdornment: <InputAdornment position="end">원</InputAdornment>,
                        }}
                        value={editData.MONTHLY_PRICE}
                        onChange={(e) => {
                          // 숫자만 남기기
                          const rawValue = e.target.value.replace(/[^0-9]/g, "");
                          // 콤마 추가
                          const formattedValue = rawValue ? Number(rawValue).toLocaleString() : "";
                          setEditData({...editData, MONTHLY_PRICE: formattedValue});
                        }}
                      />

                      {/* 3. 결제 예정일 */}
                      <TextField
                        label="결제 예정일"
                        fullWidth
                        value={editData.NEXT_BILLING_DT}
                        onChange={(e) => setEditData({...editData, NEXT_BILLING_DT: e.target.value})}
                      />

                      {/* 4. 정기 결제일 (드롭다운) */}
                      <TextField
                        select
                        label="정기 결제일"
                        fullWidth // 또는 sx={{ width: '150px' }}
                        value={editData.ANCHOR_DAY || ''}
                        onChange={(e) => setEditData({...editData, ANCHOR_DAY: e.target.value})}
                        SelectProps={{
                          MenuProps: {
                            PaperProps: {
                              style: {
                                maxHeight: 200, // 픽셀 단위로 높이 제한 (약 5~6개 항목 노출)
                                width: 120,     // 드롭다운 펼쳐졌을 때의 너비도 조절 가능
                              },
                            },
                          },
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
                        fullWidth // 또는 sx={{ width: '150px' }}
                        value={editData.BILLING_CYCLE || ''}
                        onChange={(e) => setEditData({...editData, BILLING_CYCLE: e.target.value})}
                        SelectProps={{
                          MenuProps: {
                            PaperProps: {
                              style: {
                                maxHeight: 200, // 픽셀 단위로 높이 제한 (약 5~6개 항목 노출)
                                width: 120,     // 드롭다운 펼쳐졌을 때의 너비도 조절 가능
                              },
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
                        value={editData.CATEGORY}
                        onChange={(e) => setEditData({...editData, CATEGORY: e.target.value})}
                      />

                      {/* 7. 상태 (드롭다운 + Chip 아이콘) */}
                      <TextField
                        select
                        label="상태"
                        fullWidth
                        value={editData?.USE_YN || 'Y'}
                        onChange={(e) => setEditData({ ...editData, USE_YN: e.target.value })}
                      >
                        <MenuItem value="Y">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label="사용 중" 
                              color="success" 
                              variant="outlined" 
                              size="small" 
                              sx={{ fontWeight: 'bold', cursor: 'pointer' }} 
                            />
                          </Box>
                        </MenuItem>
                        <MenuItem value="N">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip 
                              label="만료됨" 
                              color="error" 
                              variant="outlined" 
                              size="small" 
                              sx={{ fontWeight: 'bold', cursor: 'pointer' }} 
                            />
                          </Box>
                        </MenuItem>
                      </TextField>

                      {/* 8. 생성일 */}
                      <TextField
                        label="생성일"
                        disabled
                        fullWidth
                        value={editData.CREATE_DT}
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
                  )}
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                  <Button onClick={handleCloseEdit} color="inherit">닫기</Button>
                  <Button
                    onClick={() => {
                      const priceValue = editData.MONTHLY_PRICE ? String(editData.MONTHLY_PRICE) : "0";
                      const priceWithoutComma = priceValue.replace(/,/g, "");
                      updateMutation.mutate({
                        ...editData,
                        MONTHLY_PRICE: priceWithoutComma, // 숫자 형태의 문자열로 전송
                        userName: user.username,
                        SEQ: editData.SEQ
                      });
                    }}
                    disabled={
                      !editData ||
                      oldEditData.SERVICE_NM === editData.SERVICE_NM &&
                      oldEditData.MONTHLY_PRICE === editData.MONTHLY_PRICE &&
                      oldEditData.NEXT_BILLING_DT === editData.NEXT_BILLING_DT &&
                      oldEditData.ANCHOR_DAY === editData.ANCHOR_DAY &&
                      oldEditData.BILLING_CYCLE === editData.BILLING_CYCLE &&
                      oldEditData.CATEGORY === editData.CATEGORY &&
                      oldEditData.USE_YN === editData.USE_YN ||
                      updateMutation.isLoading
                    }
                    variant="contained" 
                    sx={{ backgroundColor: '#000', '&:hover': { backgroundColor: '#333' } }}
                  >
                    저장하기
                  </Button>
                </DialogActions>

              </Dialog>
              {/* --------------------------------------------------------------------------
                수정 화면 팝업
              -------------------------------------------------------------------------- */}
            </div>
          </div>
          
          <div className={styles.tablePlaceholder}>
            <DataGrid 
              rows={subListData.filter((row) => 
                      row.SERVICE_NM.toLowerCase().includes(searchText.toLowerCase())
                    )}
              getRowId={(row) => row.SEQ} 
              columns={columns} 
              onCellClick={handleCellClick}
              loading={issubListLoading || isSubListFetching} 
              sx={{ cursor: 'pointer' }}
              initialState={{
                columns: {
                  columnVisibilityModel: {
                    SEQ: false,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* 오른쪽: 사이드바 */}
        <div className={styles.sidebar}>
          
          {/* 지출 분포 박스 */}
          <div className={`${styles.card} ${styles.chartCard}`}>
            <h4>활성화된 구독 지출 분포</h4>
            <div style={{ height: '250px', marginTop: '20px' }}>
              {chartResult.length > 0 ? (
                <Doughnut data={data} options={options} />
              ) : (
                <div className={styles.noData}>
                  {/* MUI 아이콘 등을 추가하면 더 예쁩니다 */}
                  <p>등록된 구독 내역이 없습니다.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>새로운 구독을 추가해 보세요!</p>
                </div>
              )}
            </div>
          </div>

          {/* 최근 활동 박스 */}
          <div className={`${styles.card} ${styles.activityCard}`}>
            <h4>최근 활동 및 알림</h4>
            <div className={styles.activityList}>
              <p>뭘 적는게 좋을까요?</p>
              <p>구독 추가/수정/삭제 시 알림이 뜨면 좋을 것 같은데, 일단은 고정된 문구로 넣어봤습니다.</p>
              <p>위 문구는 자동완성 입니다.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default MainPage;
