import AuthThemeFrame from "@/components/shared/AuthThemeFrame";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthThemeFrame>{children}</AuthThemeFrame>;
}
