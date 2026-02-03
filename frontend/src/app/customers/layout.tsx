import DashboardLayout from "../(dashboard)/layout";

export default function CustomersLayoutWrapper({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
