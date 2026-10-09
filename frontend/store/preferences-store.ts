import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
    toastNotifications: boolean;
    setToastNotifications: (value: boolean) => void;
}

// Per browser, not per account: on a shared machine the next person inherits it.
export const usePreferences = create<PreferencesState>()(
    persist(
        (set) => ({
            toastNotifications: true,
            setToastNotifications: (value) => set({ toastNotifications: value }),
        }),
        { name: "veritas-preferences", version: 1 },
    ),
);