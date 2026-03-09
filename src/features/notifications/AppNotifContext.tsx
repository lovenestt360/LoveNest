import { createContext, useContext, type ReactNode } from "react";
import { useAppNotifications } from "@/hooks/useAppNotifications";

interface AppNotifContextType {
  chatUnread: number;
  moodUnread: number;
  tasksUnread: number;
  memoriesUnread: number;
  scheduleUnread: number;
  prayerUnread: number;
  complaintsUnread: number;
  resetChatUnread: () => void;
  resetMoodUnread: () => void;
  resetTasksUnread: () => void;
  resetMemoriesUnread: () => void;
  resetScheduleUnread: () => void;
  resetPrayerUnread: () => void;
  resetComplaintsUnread: () => void;
}

const AppNotifContext = createContext<AppNotifContextType>({
  chatUnread: 0,
  moodUnread: 0,
  tasksUnread: 0,
  memoriesUnread: 0,
  scheduleUnread: 0,
  prayerUnread: 0,
  complaintsUnread: 0,
  resetChatUnread: () => {},
  resetMoodUnread: () => {},
  resetTasksUnread: () => {},
  resetMemoriesUnread: () => {},
  resetScheduleUnread: () => {},
  resetPrayerUnread: () => {},
  resetComplaintsUnread: () => {},
});

export function AppNotifProvider({ children }: { children: ReactNode }) {
  const value = useAppNotifications();
  return <AppNotifContext.Provider value={value}>{children}</AppNotifContext.Provider>;
}

export function useAppNotifContext() {
  return useContext(AppNotifContext);
}
