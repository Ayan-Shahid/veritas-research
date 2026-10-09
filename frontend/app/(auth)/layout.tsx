import { ClientBackground } from "@/components/background/client-background";

// One shader background for every auth page (login, register, forgot-password).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ClientBackground />
            {children}
        </>
    );
}