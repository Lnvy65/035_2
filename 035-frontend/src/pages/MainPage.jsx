import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi } from "../api/mainpageApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Chip, IconButton, TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  // 팝업 및 데이터 관리를 위한 State 추가
  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null);

  // 임시 권한 체크 함수 (필요에 따라 수정)
  const checkPermission = (row) => ({ canEdit: true });

  // 차트 색상 팔레트 (필요에 따라 추가/수정 가능)
  const generateColors = (count) => {
    return Array.from({ length: count }, (_, i) => {
      const hue = (i * (360 / count)) % 360;
      return `hsl(${hue}, 70%, 60%)`; // 채도 70%, 명도 60%로 일관성 유지
    });
  };


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
      valueFormatter: (value) => (value ? `매월 ${value}일` : "-")
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
        const { canEdit } = checkPermission(params.row);
        return canEdit ? (
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
        ) : null;
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
    수정화면팝업 핸들러
  -------------------------------------------------------------------------------- */  
  const handleCellClick = (params) => {
    // 1. 클릭한 컬럼이 'tier'인 경우 바로 리뷰 팝업 오픈
    if (params.field === 'tier') {
      setEditData({ ...params.row }); // 리뷰 조회에 필요한 seq를 위해 데이터 설정
      setOpenReview(true);
      return; // 여기서 함수를 종료하여 수정 팝업(openEdit)이 뜨지 않게 함
    }

    // 2. 삭제 버튼(actions) 클릭 시에는 로직 방지 (이미 IconButton에서 e.stopPropagation 처리됨)
    if (params.field === 'actions') return;

    // 3. 그 외의 컬럼(제목, 내용 등) 클릭 시 수정/상세 팝업 오픈
    setEditData({ ...params.row });

    if (params.row.picture && params.row.picture !== "null") {
      setImagePreview(params.row.picture);
    } else {
      setImagePreview(null);
    }
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
          <p style={{color: '#817d7d'}}>총 월간 예상 구독 금액</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{sumresult.sum ? sumresult.sum.toLocaleString() : 0}원</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          {/* 구독 수 박스 */}
          <p style={{color: '#817d7d'}}>구독 수</p>
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

              <button className={styles.addButton} onClick={() => setOpenEdit(true)}>
                <span style={{ marginRight: '4px' }}>+</span> 추가
              </button>
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
            <h4>월간 지출 분포</h4>
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
