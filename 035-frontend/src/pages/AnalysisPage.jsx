import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, Typography, Grid } from "@mui/material";
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

import { selectsublistApi, selectcurnmApi } from "../api/mainpageApi";
import useAuthStore from "../store/authStore";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const AnalysisPage = () => {
  const user = useAuthStore((state) => state.user);
  const userName = user?.username;

  const currentMonth = new Date().getMonth() + 1;

  const chartLabels = Array.from({ length: 12 }, (_, i) => {
    const m = (currentMonth + i - 1) % 12 + 1;
    return m < currentMonth ? `내년 ${m}월` : `${m}월`;
  });

  const { data: curNMData = [] } = useQuery({
    queryKey: ["selectcurNM"],
    queryFn: () => selectcurnmApi({}),
    refetchOnWindowFocus: false,
  });
  const currencies = Array.isArray(curNMData) ? curNMData : (curNMData?.result || []);
  const prefCurrency = localStorage.getItem("prefCurrency") || "KRW";

  /* --------------------------------------------------------------------------------
   데이터 가져오기
  -------------------------------------------------------------------------------- */
  const { data: subListData = [], isLoading, isError } = useQuery({
    queryKey: ["selectsublist", userName],
    queryFn: () => selectsublistApi({ userName }),
    enabled: !!userName,
    refetchOnWindowFocus: false,
    retry: 0,
  });

  /* --------------------------------------------------------------------------------
   데이터 가공 로직 (현재 달을 기준으로 향후 12개월 연산)
  -------------------------------------------------------------------------------- */
  const analysisData = useMemo(() => {
    const monthlySpending = Array(12).fill(0);

    if (!subListData || subListData.length === 0) {
      return { monthlySpending, totalYearly: 0, averageMonthly: 0, maxMonthName: "없음", maxSpending: 0 };
    }

    const activeSubs = subListData.filter(
      (item) => item.USE_YN === "Y" || item.USE_YN === "사용중"
    );

    activeSubs.forEach((sub) => {
      let price = Number(sub.MONTHLY_PRICE || 0);
      
      // 1. 해당 구독의 통화(currency)를 KRW로 변환
      const subCur = sub.CURRENCY || "KRW";
      const subCurData = currencies.find(c => c.currency === subCur);
      const subRate = subCurData?.exchange_rate ? Number(subCurData.exchange_rate) : 1;
      let priceInKRW = price * subRate;

      // 2. KRW로 변환된 금액을 사용자가 설정한 선호 통화(prefCurrency)로 변환
      const prefCurData = currencies.find(c => c.currency === prefCurrency);
      const prefRate = prefCurData?.exchange_rate ? Number(prefCurData.exchange_rate) : 1;
      
      let convertedPrice = priceInKRW / prefRate;
      if (prefCurrency === "KRW" || prefCurrency === "JPY") {
        convertedPrice = Math.round(convertedPrice);
      } else {
        convertedPrice = Math.round(convertedPrice * 100) / 100;
      }

      const cycle = Number(sub.BILLING_CYCLE || 1);

      const baseDate = sub.NEXT_BILLING_DT ? new Date(sub.NEXT_BILLING_DT) : new Date();
      const baseMonth = baseDate.getMonth() + 1;

      for (let i = 0; i < 12; i++) {
        // 실제 달력 상의 월 (1~12)
        const targetMonth = (currentMonth + i - 1) % 12 + 1; 

        if (cycle === 1) {
          monthlySpending[i] += convertedPrice;
        } else {
          // 주기가 3, 6, 12개월인 경우: (검사하는 달 - 기준 달)이 주기로 나누어 떨어지면 결제
          if (Math.abs(targetMonth - baseMonth) % cycle === 0) {
            monthlySpending[i] += convertedPrice;
          }
        }
      }
    });

    // 통계 계산
    const totalYearly = monthlySpending.reduce((acc, cur) => acc + cur, 0);
    const averageMonthly = prefCurrency === "KRW" || prefCurrency === "JPY" ? Math.round(totalYearly / 12) : Math.round((totalYearly / 12) * 100) / 100;
    
    const maxSpending = Math.max(...monthlySpending);
    const maxIndex = monthlySpending.indexOf(maxSpending); // 0~11 사이의 인덱스
    const maxMonthNum = (currentMonth + maxIndex - 1) % 12 + 1;
    // 과거 달로 돌아가면 '내년'을 붙여줌
    const maxMonthName = maxMonthNum < currentMonth ? `내년 ${maxMonthNum}월` : `${maxMonthNum}월`;

    return { monthlySpending, totalYearly, averageMonthly, maxMonthName, maxSpending };
  }, [subListData, currentMonth, currencies, prefCurrency]);

  /* --------------------------------------------------------------------------------
   차트 옵션 설정
  -------------------------------------------------------------------------------- */
  const chartData = {
    labels: chartLabels, // 동적으로 만든 라벨 적용
    datasets: [
      {
        label: `예상 월별 지출 (${prefCurrency === "KRW" ? "원" : prefCurrency})`,
        data: analysisData.monthlySpending,
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
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y.toLocaleString()} ${prefCurrency === "KRW" ? "원" : prefCurrency}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value.toLocaleString()} ${prefCurrency === "KRW" ? "원" : prefCurrency}`,
        },
      },
    },
  };

  if (isLoading) return <Box p={3}>데이터를 불러오는 중입니다...</Box>;
  if (isError) return (
    <Box p={3} color="error.main">
      <h3>데이터를 불러오는 데 실패했습니다.</h3>
      <p>로그인 세션이 만료되었을 수 있습니다. 로그아웃 후 다시 로그인해 보세요!</p>
    </Box>
  );

  return (
    <Box sx={{ maxWidth: 1200, margin: "0 auto", padding: "20px" }}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          향후 12개월 지출 분석
        </Typography>
        <Typography variant="body1" color="text.secondary">
          이번 달부터 내년까지의 예상 구독 지출 흐름을 확인하세요.
        </Typography>
      </Box>

      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Typography color="text.secondary" gutterBottom>
              향후 1년간 총 예상 지출
            </Typography>
            <Typography variant="h4" fontWeight="bold">
          {analysisData.totalYearly.toLocaleString()} {prefCurrency === "KRW" ? "원" : prefCurrency}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
            <Typography color="text.secondary" gutterBottom>
              월 평균 지출
            </Typography>
            <Typography variant="h4" fontWeight="bold">
          {analysisData.averageMonthly.toLocaleString()} {prefCurrency === "KRW" ? "원" : prefCurrency}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", border: "1px solid #e3f2fd" }}>
            <Typography color="text.secondary" gutterBottom>
              지출이 가장 큰 달 (주의 요망)
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {analysisData.maxMonthName} {/* 동적으로 바뀐 라벨 이름 */}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
          ({analysisData.maxSpending.toLocaleString()} {prefCurrency === "KRW" ? "원" : prefCurrency} 예정)
            </Typography>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ p: 3, borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)", height: "400px" }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>
          예산 흐름도
        </Typography>
        <Box sx={{ height: "300px" }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
      </Card>
    </Box>
  );
};

export default AnalysisPage;