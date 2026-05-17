// [수정된 부분] 대시보드 위젯 상태 브라우저 저장을 위한 전역 스토어 생성
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useDashboardStore = create(
  persist(
    (set) => ({
      widgets: [
        { id: 'totalAmount', type: 'summary', visible: true, title: '총 구독 금액' },
        { id: 'activeCount', type: 'summary', visible: true, title: '활성화된 구독 수' },
        { id: 'nextBilling', type: 'summary', visible: true, title: '다음 결제 예정' },
        { id: 'subList', type: 'list', visible: true, title: '내 구독 목록' },
        { id: 'chartArea', type: 'chart', visible: true, title: '구독 지출 분포' },
        { id: 'activityArea', type: 'activity', visible: true, title: '최근 활동' }
      ],

      setWidgets: (newWidgets) => set({ widgets: newWidgets }),

      toggleWidget: (id) => set((state) => ({
        widgets: state.widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w)
      })),
    }),
    { name: 'dashboard-storage' } // localStorage에 저장될 키 이름
  )
);

export default useDashboardStore;