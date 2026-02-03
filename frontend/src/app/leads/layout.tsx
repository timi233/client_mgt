import DashboardLayout from "../(dashboard)/layout";

export default function LeadsLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
