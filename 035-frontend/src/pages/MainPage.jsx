import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi, insertSubApi, updateSubApi } from "../api/mainpageApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { 
  TextField,
  InputAdornment,
  Button
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { generateColors } from "../utils/constants";
import { useSubColumns } from "../hooks/useSubColumn";
import CreateSubModal from "../components/CreateSubModal";
import EditSubModal from "../components/EditSubModal";

ChartJS.register(ArcElement, Tooltip, Legend);

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const [oldEditData, setOldEditData] = useState(null);

  const [openCreate, setOpenCreate] = useState(false);

  /* --------------------------------------------------------------------------------
   월간 구독 금액, 구독 수 조회
  -------------------------------------------------------------------------------- */
  const { data: sumData = [], isLoading: isSumLoading, refetch: refetchSum, isFetching: isSumFetching } = useQuery(
    {
      queryKey: ["selectsum", user?.username],
      queryFn: () => selectsumApi({ userName: user?.username }),
      enabled: !!user?.username, 
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
      enabled: !!user?.username, 
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
      enabled: !!user?.username, 
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
        queryClient.invalidateQueries({ queryKey: ["selectsubchart"] });
      });
    }
  };

  const columns = useSubColumns(handleDelete);

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
    if (params.field === 'actions') return;

    const formattedPrice = params.row.MONTHLY_PRICE 
      ? Number(params.row.MONTHLY_PRICE).toLocaleString() 
      : "";

    const rowWithFormattedPrice = { 
      ...params.row, 
      MONTHLY_PRICE: formattedPrice 
    };

    setEditData(rowWithFormattedPrice);
    setOldEditData(rowWithFormattedPrice); 
    setOpenEdit(true);
  };

  /* --------------------------------------------------------------------------------
    도넛 차트
  -------------------------------------------------------------------------------- */  
  const data = useMemo(() => ({
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
  }), [chartResult]);

  const options = useMemo(() => ({
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
      },
    },
  }), []);

  const handleCloseCreate = () => {
    setOpenCreate(false);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setEditData(null); 
    setOldEditData(null); 
  };

  const filteredRows = useMemo(() => {
    return subListData.filter((row) => 
      row.SERVICE_NM.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [subListData, searchText]);

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
                onChange={(e) => setSearchText(e.target.value)} 
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

              <CreateSubModal 
                open={openCreate} 
                onClose={handleCloseCreate} 
                onSave={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
                username={user?.username}
              />
              
              <EditSubModal 
                open={openEdit} 
                editData={editData}
                setEditData={setEditData} 
                oldEditData={oldEditData} 
                onClose={handleCloseEdit} 
                onSave={(data) => {
                  updateMutation.mutate({
                    ...data,
                    userName: user.username 
                  });
                }}
                isLoading={updateMutation.isPending}
              />

            </div>
          </div>
          
          <div className={styles.tablePlaceholder}>
            <DataGrid 
              rows={filteredRows}
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