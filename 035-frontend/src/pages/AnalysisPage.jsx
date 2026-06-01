import React, { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Divider } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { DataGrid } from '@mui/x-data-grid';
import { selectsubchartdataApi, selectavgApi, selectcntcategorydataApi, selectCategoryDetailApi } from "../api/analysispage";
import useAuthStore from "../store/authStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const AnalysisPage = () => {
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  // 모달 상태 및 선택된 데이터 상태
  const [open, setOpen] = useState(false);
  const [selectedData, setSelectedData] = useState({ month: "", amount: 0 });

  // 1번째 DataGrid에서 선택한 카테고리 상태를 관리
  const [selectedCategory, setSelectedCategory] = useState("");

  // Chart Component에 접근하기 위한 ref 생성
  const chartRef = useRef(null);

  // 막대 클릭 이벤트 핸들러
  const handleChartClick = (event) => {
    const { current: chart } = chartRef;
    if (!chart) return;

    const elements = chart.getElementsAtEventForMode(event, "nearest", { intersect: true }, true);

    if (elements.length > 0) {
      const { index } = elements[0];
      const clickedMonth = chartData.labels[index];
      const clickedAmount = chartData.datasets[0].data[index];

      setSelectedData({ month: clickedMonth, amount: clickedAmount });
      setSelectedCategory("");
      setOpen(true);
    }
  };

  // Dialog 닫기 함수
  const handleClose = () => {
    setOpen(false);
    setSelectedCategory("");
  };

  // 1번째 DataGrid의 행(Row) 클릭 이벤트 핸들러
  const handleRowClick = (params) => {
    // params.row에는 클릭한 행의 전체 데이터가 들어있습니다.
    if (params.row && params.row.CATEGORY) {
      setSelectedCategory(params.row.CATEGORY);
    }
  };

  /* --------------------------------------------------------------------------------
   차트 데이터 가져오기
  -------------------------------------------------------------------------------- */
  const { data: subBarChartData = [], isLoading: isDataLoading, refetch: refetchData, isFetching: isDataFetching, isError: isError } = useQuery(
    {
      queryKey: ["selectsubchartdata", userId],
      queryFn: () => selectsubchartdataApi({ userId }),
      enabled: !!userId, // userId가 있을 때만 쿼리 실행
      refetchOnWindowFocus: false,
    }
  );
  const dataresult = subBarChartData?.result || [];

  /* --------------------------------------------------------------------------------
   평균 데이터 가져오기
  -------------------------------------------------------------------------------- */
  const { data: avgData = {}, isLoading: isAvgLoading, refetch: refetchAvg, isFetching: isAvgFetching, isError: isAvgError } = useQuery(
    {
      queryKey: ["selectavg", userId],
      queryFn: () => selectavgApi({ userId }),
      enabled: !!userId, // userId가 있을 때만 쿼리 실행
      refetchOnWindowFocus: false,
    }
  );
  const avgResult = avgData?.result || {};

  /* --------------------------------------------------------------------------------
   카테고리별 개수 데이터 가져오기
  -------------------------------------------------------------------------------- */
  const { data: cntCategoryData = [], isLoading: isCntCategoryDataLoading, refetch: refetchCntCategoryData, isFetching: isCntCategoryDataFetching, isError: isCntCategoryError } = useQuery(
    {
      queryKey: ["selectcntcategorydata", userId, selectedData.month],
      queryFn: () => selectcntcategorydataApi({ userId, selectedDate: selectedData.month }),
      enabled: !!userId && !!selectedData.month,
      refetchOnWindowFocus: false,
    }
  );
  const cntcategorydataresult = cntCategoryData?.result || [];

  /* --------------------------------------------------------------------------------
   [DataGrid 2] 클릭한 카테고리의 "상세" 데이터 가져오기 (신규 추가)
  -------------------------------------------------------------------------------- */
  const { data: categoryDetailData = [], isLoading: isDetailLoading } = useQuery({
    // 월과 카테고리가 모두 바뀔 때마다 데이터를 새로 동적 패치합니다.
    queryKey: ["selectCategoryDetail", userId, selectedData.month, selectedCategory],
    queryFn: () => selectCategoryDetailApi({ userId, selectedDate: selectedData.month, category: selectedCategory }),
    enabled: !!userId && !!selectedData.month && !!selectedCategory,
    refetchOnWindowFocus: false,
  });
  const categoryDetailResult = categoryDetailData?.result || [];

  /* --------------------------------------------------------------------------------
   차트 옵션 설정
  -------------------------------------------------------------------------------- */
  const chartData = {
    labels: dataresult.map((item) => item.date),
    datasets: [
      {
        label: "월별 지출 (원)",
        data: dataresult.map((item) => item.sum),
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleChartClick,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y.toLocaleString()}원`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value.toLocaleString()}원`,
        },
      },
    },
  };
  /* --------------------------------------------------------------------------------
   차트 옵션 설정
  -------------------------------------------------------------------------------- */

  /* --------------------------------------------------------------------------------
   데이터 그리드 설정차트 옵션 설정
  -------------------------------------------------------------------------------- */
  const cntCategoryDataColumns = [
    { field: "SEQ",
      headerName: "No.",
      width: 20,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => {
        const rowIndex = params.api.getRowIndexRelativeToVisibleRows(params.id);
        return rowIndex + 1;
      }
    },
    { field: 'MONTH', headerName: '일자(월)', width: 185, align: "center", headerAlign: "center" },
    { field: 'CATEGORY', headerName: '카테고리', width: 185, align: "center", headerAlign: "center" },
    { field: 'CATEGORY_SUM',
      headerName: '지출 금액(원)',
      align: "center",
      headerAlign: "center",
      width: 183,
      valueFormatter: (value) => value != null ? `${Number(value).toLocaleString()}원` : '0원'
    },
    { field: 'CATEGORY_CNT', headerName: '카테고리 합계', align: "center", headerAlign: "center", width: 183 },
  ];
  /* --------------------------------------------------------------------------------
   데이터 그리드 설정차트 옵션 설정
  -------------------------------------------------------------------------------- */

  /* --------------------------------------------------------------------------------
   2번째 DataGrid 컬럼 (상세 결제 내역 리스트)
  -------------------------------------------------------------------------------- */
  const categoryDetailColumns = [
    { field: "SEQ",
      headerName: "No.",
      width: 20,
      align: "center",
      headerAlign: "center",
    },
    { field: 'DATE', headerName: '일자(월)', width: 160, align: "center", headerAlign: "center" },
    { field: 'SERVICE_NM', headerName: '서비스명', width: 160, align: "center", headerAlign: "center" },
    { field: 'CATEGORY', headerName: '카테고리', width: 160, align: "center", headerAlign: "center" },
    { field: 'PRICE', headerName: '가격', width: 152, align: "center", headerAlign: "center", valueFormatter: (value) => `${Number(value).toLocaleString()}` },
    { field: 'CURRENCY', headerName: '통화', width: 152, align: "center", headerAlign: "center" },
  ];
  /* --------------------------------------------------------------------------------
   2번째 DataGrid 컬럼 (상세 결제 내역 리스트)
  -------------------------------------------------------------------------------- */
  

  if (isDataLoading) return <Box p={3}>데이터를 불러오는 중입니다...</Box>;
  if (isError) return (
    <Box p={3} color="error.main">
      <h3>데이터를 불러오는 데 실패했습니다.</h3>
      <p>로그인 세션이 만료되었을 수 있습니다. 로그아웃 후 다시 로그인해 보세요!</p>
    </Box>
  );

  if (dataresult.length === 0) {
    return (
      <Box sx={{ maxWidth: 1200, margin: "0 auto", padding: "20px", textAlign: "center", mt: 8 }}>
        <Card sx={{ p: 5, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px dashed #ccc" }}>
          <Typography variant="h5" fontWeight="bold" color="text.secondary" gutterBottom>
            지출 분석 데이터가 없습니다.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            저장된 로그가 없습니다. 먼저 소비 내역을 등록해 주세요!
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          지난 1년 지출 분석
        </Typography>
        <Typography variant="body1" color="text.secondary">
          지난 1년 동안의 실제 구독 지출 흐름을 확인하세요.
        </Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
          <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Typography color="text.secondary" gutterBottom>
              1년간 총 지출
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {Number((avgResult?.payforyear ?? 0)).toLocaleString()}원
            </Typography>
          </Card>
          <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Typography color="text.secondary" gutterBottom>
              월 평균 지출
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {Number((avgResult?.avg ?? 0)).toLocaleString()}원
            </Typography>
          </Card>
      </Grid>

      <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: "400px" }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          지출 흐름도 (막대를 클릭해보세요!)
        </Typography>
        <Box sx={{ height: "300px" }}>
          <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </Box>
      </Card>

      {/* 지출 상세 내역 모달 */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>
          {selectedData.month} 지출 상세 내역
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="primary">
            1. 카테고리별 요약 (행을 클릭하면 하단에 상세 내역이 나옵니다)
          </Typography>
          <Box sx={{ height: 350, width: '100%', bgcolor: 'background.paper', p: 3, my: 1, boxSizing: 'border-box' }}>
            <DataGrid
              rows={cntcategorydataresult}
              columns={cntCategoryDataColumns}
              getRowId={(row) => row.SEQ}
              initialState={{ pagination: { paginationModel: { pageSize: 3 } } }}
              pageSizeOptions={[3, 5]}
              onRowClick={handleRowClick} 
              sx={{ cursor: 'pointer' }}
            />
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1" fontWeight="bold" mb={1} color="secondary">
            2. [{selectedCategory || "선택 없음"}] 카테고리 상세 소비 리스트
          </Typography>
          <Box sx={{ height: 350, width: '100%', bgcolor: 'background.paper' }}>
            {selectedCategory ? (
              <DataGrid
                rows={categoryDetailResult}
                columns={categoryDetailColumns}
                getRowId={(row) => row.SEQ}
                initialState={{ pagination: { paginationModel: { pageSize: 3 } } }}
                pageSizeOptions={[3, 5]}
                loading={isDetailLoading} // 데이터를 받아오는 동안 스피너 로딩 효과 작동
                disableRowSelectionOnClick
              />
            ) : (
              // 아직 카테고리를 클릭하지 않았을 때 안내 멘트 표시
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography color="text.secondary">
                  상단의 카테고리 요약 표에서 원하는 항목을 클릭해 주세요.
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} variant="contained" color="primary">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AnalysisPage;