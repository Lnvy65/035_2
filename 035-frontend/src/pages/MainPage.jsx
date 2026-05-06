import useAuthStore from "../store/authStore";
import styles from '../styles/MainPage.module.css';
import { selectsumApi, selectdateApi, selectsublistApi, selectsubchartApi, deleteSubApi, insertSubApi, updateSubApi } from "../api/mainpageApi";
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
  sum: (username) => ["subscription", "sum", username],
  date: (username) => ["subscription", "date", username],
  list: (username) => ["subscription", "list", username],
  chart: (username) => ["subscription", "chart", username],
};

const MainPage = () => {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");

  const [openEdit, setOpenEdit] = useState(false);
  const [editData, setEditData] = useState(null); // 원본 데이터만 유지

  const [openCreate, setOpenCreate] = useState(false);

  const userName = user?.username;

  // --- Queries ---
  const { data: sumData, isLoading: isSumLoading } = useQuery({
    queryKey: QUERY_KEYS.sum(userName),
    queryFn: () => selectsumApi({ userName }),
    enabled: !!userName,
  });
  const sumresult = sumData?.result?.[0] || { sum: 0, count: 0 };

  const { data: dateData, isLoading: isdateLoading } = useQuery({
    queryKey: QUERY_KEYS.date(userName),
    queryFn: () => selectdateApi({ userName }),
    enabled: !!userName,
  });
  const dateresult = dateData?.result?.[0] || { NEXT_BILLING_DT: 0, SERVICE_NM: 0 };

  const { data: subListData = [], isLoading: issubListLoading, refetch: refetchSubList } = useQuery({
    queryKey: QUERY_KEYS.list(userName),
    queryFn: () => selectsublistApi({ userName }),
    enabled: !!userName,
  });

  const { data: subchartData, isLoading: issubchartLoading } = useQuery({
    queryKey: QUERY_KEYS.chart(userName),
    queryFn: () => selectsubchartApi({ userName }),
    enabled: !!userName,
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

  const filteredRows = useMemo(() => {
    if (!subListData.length) return [];
    return subListData.filter((row) => 
      row.SERVICE_NM.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [subListData, searchText]);

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>안녕하세요, {userName}님!</h2>
        <p style={{color: '#817d7d'}}>이번 달 구독 내역을 확인해 보세요.</p>
      </div>

      <div className={styles.summarySection}>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>활성화된 총 구독 금액</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{sumresult.sum?.toLocaleString() || 0}원</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>활성화된 구독 수</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>{sumresult.count || 0}개</p>
        </div>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <p style={{color: '#817d7d'}}>다음 결제 예정</p>
          <p style={{fontSize: '24px', fontWeight: 'bold', marginTop: '8px'}}>
            {dateresult.NEXT_BILLING_DT ? `${dateresult.SERVICE_NM} - ${dateresult.NEXT_BILLING_DT}` : '정보 없음'}
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
                onSave={(data) => updateMutation.mutate({ ...data, userName })}
                isLoading={updateMutation.isPending}
              />
            </div>
          </div>
          
          <div className={styles.tablePlaceholder}>
            <DataGrid 
              rows={filteredRows} getRowId={(row) => row.SEQ} columns={columns} onCellClick={handleCellClick}
              loading={issubListLoading} sx={{ cursor: 'pointer' }}
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