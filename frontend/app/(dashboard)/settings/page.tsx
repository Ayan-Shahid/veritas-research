import type { Metadata } from "next";
import { SettingsContainer } from "@/components/containers/settings-container";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
    return <SettingsContainer />;
}