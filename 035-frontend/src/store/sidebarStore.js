import { create } from 'zustand';

const useSidebarStore = create((set) => ({
  isOpen: false,
  // set 함수 내에서 이전 상태(state)를 인자로 받아야 !state.isOpen이 가능합니다.
  toggleSidebar: () =>
    // state은 현재상태
    set((state) => ({
      isOpen: !state.isOpen,
    })),

  closeSidebar: () =>
    set({
      isOpen: false,
    }),
}));

export default useSidebarStore;