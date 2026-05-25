import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectmonthlysumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi, insertSubApi, updateSubApi, selectsubkrlistApi } from "../api/mainpageApi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { TextField, InputAdornment, Button } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

import { generateColors } from "../utils/constants";
import { useSubColumns } from "../hooks/useSubColumn";
import CreateSubModal from "../components/CreateSubModal";
import EditSubModal from "../components/EditSubModal";

ChartJS.register(ArcElement, Tooltip, Legend);

// 💡 [Refactor] Query Key를 계층화하여 관리를 쉽게 만듭니다.
const QUERY_KEYS = {
  all: ["subscription"],
  sum: (userId) => ["subscription", "sum", userId],
  monthlySum: (userId) => ["subscription", "monthlySum", userId],
  date: (userId) => ["subscription", "date", userId],
  list: (userId) => ["subscription", "list", userId],
  chart: (userId) => ["subscription", "chart", userId],
};

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null); // 원본 데이터만 유지

  const [openCreate, setOpenCreate] = useState(false);

  const [isKrwMode, setIsKrwMode] = useState(false);

  const userName = user?.username;

  const userId = user?.id;

  // --- Queries ---
  const { data: sumData, isLoading: isSumLoading } = useQuery({
    queryKey: QUERY_KEYS.sum(userId),
    queryFn: () => selectsumApi({ userId }),
    enabled: !!userId,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      staleTime: 0,
  });
  const totalSumResult = sumData?.result?.[0] || { sum: 0, count: 0 };

  const { data: monthlySumResultsumData, isLoading: isMonthlySumLoading } = useQuery({
  queryKey: QUERY_KEYS.monthlySum(userId),
  queryFn: () => selectmonthlysumApi({ userId }),
  enabled: !!userId,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  staleTime: 0,
  });
  const monthlySumResult = monthlySumResultsumData?.result?.[0] || { sum: 0, count: 0 };

  const { data: dateData, isLoading: isdateLoading } = useQuery({
    queryKey: QUERY_KEYS.date(userId),
    queryFn: () => selectdateApi({ userId }),
    enabled: !!userId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });
  const dateresult = dateData?.result?.[0] || { NEXT_BILLING_DT: 0, SERVICE_NM: 0 };

  // 1. 외화 리스트 (기본 모드)
  const { data: subListData = [], isLoading: issubListLoading } = useQuery({
    queryKey: QUERY_KEYS.list(userId),
    queryFn: () => selectsublistApi({ userId }),
    // KRW 모드가 아닐 때만 호출 (!!userId는 로그인이 되어있을 때라는 기본 조건)
    enabled: !!userId && !isKrwMode,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });

  // 2. 원화 환산 리스트 (원화 모드)
  const { data: subKRListData = [], isLoading: issubKRListLoading } = useQuery({
    // [중요] 키가 중복되지 않게 'krw' 추가
    queryKey: [...QUERY_KEYS.list(userId), "krw"], 
    queryFn: () => selectsubkrlistApi({ userId }),
    // KRW 모드일 때만 호출
    enabled: !!userId && isKrwMode,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });

  const { data: subchartData, isLoading: issubchartLoading } = useQuery({
    queryKey: QUERY_KEYS.chart(userId),
    queryFn: () => selectsubchartApi({ userId }),
    enabled: !!userId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 0,
  });
  const chartResult = subchartData?.result || [];

  // --- Mutations ---
  // 💡 [Refactor] 캐시 무효화를 'subscription' 공통 키 하나로 처리
  const invalidateAllQueries = () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
  };

  const handleDelete = (row) => {
    if (window.confirm(`"${row.SERVICE_NM}" 서비스를 삭제하시겠습니까?`)) {
      deleteSubApi({ seq: row.SEQ }).then(invalidateAllQueries);
    }
  };

  const columns = useSubColumns(handleDelete);

  const createMutation = useMutation({
    mutationFn: insertSubApi,
    onSuccess: () => {
      invalidateAllQueries();
      setOpenCreate(false);
      alert("생성되었습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateSubApi,
    onSuccess: () => {
      invalidateAllQueries();
      setOpenEdit(false);
      alert("수정되었습니다.");
    },
  });

  // --- Handlers ---
  const handleCellClick = (params) => {
    if (params.field === 'actions') return;
    // 💡 [Refactor] 포맷팅 로직은 UI/Modal 컴포넌트로 위임하고, 원본 데이터만 넘깁니다.
    setEditData(params.row);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setTimeout(() => setEditData(null), 200); // 애니메이션 종료 후 초기화
  };

  const displayData = isKrwMode ? subKRListData : subListData;
  const isLoading = isKrwMode ? issubKRListLoading : issubListLoading;
 
  const filteredRows = useMemo(() => {
    // 1. subListData 처리
    const rawSubData = Array.isArray(subListData) ? subListData : (subListData?.result || []);
    // 2. subKRListData 처리
    const rawKrData = Array.isArray(subKRListData) ? subKRListData : (subKRListData?.result || []);
    
    // 3. 현재 모드에 맞는 데이터 선택
    const rows = isKrwMode ? rawKrData : rawSubData;
    
    if (!rows.length) return [];

    return rows.filter((row) => 
      row.SERVICE_NM?.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [isKrwMode, subListData, subKRListData, searchText]); 
  // 의존성에 isKrwMode를 명시적으로 넣어서 모드 변경 시 즉시 재계산되게 합니다.

  const chartOptions = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } } },
  }), []);

  const chartDataConfig = useMemo(() => ({
    labels: chartResult.map(item => item.CATEGORY),
    datasets: [{
      label: '구독 지출',
      data: chartResult.map(item => item.TOTAL_PRICE),
      backgroundColor: generateColors(chartResult.length),
      borderWidth: 1,
      cutout: '70%',
    }],
  }), [chartResult]);

  // 현재 월 이름을 한글로 가져오기
  const today = new Date();
  const monthNameKR = today.toLocaleString('ko-KR', { month: 'long' });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>안녕하세요, {userName}님!</h2>
        <p style={{color: '#817d7d'}}>구독 내역을 확인해 보세요.</p>
      </div>

      <div className={styles.summarySection}>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>활성화된 {monthNameKR} 구독 금액</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{monthlySumResult.sum?.toLocaleString() || 0}원</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>활성화된 총 구독 금액</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{totalSumResult.sum?.toLocaleString() || 0}원</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>활성화된 구독 수</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{totalSumResult.count || 0}개</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>다음 결제 예정</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>
            {dateresult.NEXT_BILLING_DT ? `${dateresult.SERVICE_NM} ${dateresult.NEXT_BILLING_DT}` : '정보 없음'}
          </p>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={`${styles.card} ${styles.listContainer}`}>
          <div className={styles.listHeader}>
            <h4>내 구독 목록</h4>
            <div className={styles.buttonGroup}>
              <TextField 
                size="small" variant="outlined" placeholder="서비스 이름 검색..." 
                value={searchText} onChange={(e) => setSearchText(e.target.value)} 
                InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" sx={{ color: '#999' }} /></InputAdornment>) }}
                sx={{ width: '220px', '& .MuiOutlinedInput-root': { borderRadius: '8px', height: '36px'} }}
              />
              <Button 
                variant="outlined" 
                size="small" 
                onClick={() => setIsKrwMode((prev) => !prev)} 
                sx={{ borderRadius: '8px', height: '36px', textTransform: 'none', borderColor: '#e5e7eb', color: '#666', minWidth: '80px' }}
              >
                {isKrwMode ? "외화 결제액으로 보기" : "원화 환산액으로 보기"}
              </Button>
              <Button variant="outlined" size="small" onClick={() => refetchSubList()} sx={{ borderRadius: '8px', height: '36px', textTransform: 'none', borderColor: '#e5e7eb', color: '#666', minWidth: '80px' }}>새로고침</Button>
              <button className={styles.addButton} onClick={() => setOpenCreate(true)}><span style={{ marginRight: '4px' }}>+</span> 추가</button>

              <CreateSubModal 
                open={openCreate} 
                onClose={() => setOpenCreate(false)} 
                onSave={(data) => createMutation.mutate(data)}
                isLoading={createMutation.isPending}
                existingSubscriptions={subListData}
              />
              
              <EditSubModal 
                open={openEdit} 
                editData={editData}
                onClose={handleCloseEdit} 
                onSave={(data) => updateMutation.mutate({ ...data, userId })}
                isLoading={updateMutation.isPending}
              />
            </div>
          </div>
          
          <div className={styles.tablePlaceholder}>
            <DataGrid 
              rows={filteredRows} // 필터링된 현재 모드의 데이터를 보여줌
              getRowId={(row) => row.SEQ} 
              columns={columns} 
              onCellClick={handleCellClick}
              loading={isLoading} // 현재 모드에 맞는 로딩 상태 표시
              sx={{ cursor: 'pointer' }}
              initialState={{ columns: { columnVisibilityModel: { SEQ: false } } }}
            />
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={`${styles.card} ${styles.chartCard}`}>
            <h4>활성화된 구독 지출 분포</h4>
            <div style={{ height: '250px', marginTop: '20px' }}>
              {chartResult.length > 0 ? (
                <Doughnut data={chartDataConfig} options={chartOptions} />
              ) : (
                <div className={styles.noData}>
                  <p>등록된 구독 내역이 없습니다.</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>새로운 구독을 추가해 보세요!</p>
                </div>
              )}
            </div>
          </div>
          <div className={`${styles.card} ${styles.activityCard}`}>
            <h4>최근 활동 및 알림</h4>
            <div className={styles.activityList}>
              <p>기능 준비 중입니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainPage;