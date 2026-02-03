"use client";

import { Layout, Menu } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined,
  LogoutOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode } from "react";

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    {
      key: "/dashboard",
      icon: <DashboardOutlined />,
      label: "仪表盘",
    },
    {
      key: "/leads",
      icon: <CustomerServiceOutlined />,
      label: "线索管理",
    },
    {
      key: "/customers",
      icon: <ShopOutlined />,
      label: "客户管理",
    },
    {
      key: "/contacts",
      icon: <TeamOutlined />,
      label: "联系人管理",
    },
    {
      key: "/opportunities",
      icon: <FileTextOutlined />,
      label: "商机管理",
    },
    {
      key: "/profile",
      icon: <UserOutlined />,
      label: "个人中心",
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const getSelectedKey = () => {
    if (pathname === "/") return "/dashboard";
    if (pathname.startsWith("/leads")) return "/leads";
    if (pathname.startsWith("/customers")) return "/customers";
    if (pathname.startsWith("/contacts")) return "/contacts";
    if (pathname.startsWith("/opportunities")) return "/opportunities";
    if (pathname.startsWith("/profile")) return "/profile";
    return pathname;
  };

  const getTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") return "仪表盘";
    if (pathname.startsWith("/leads")) return "线索管理";
    if (pathname.startsWith("/customers")) return "客户管理";
    if (pathname.startsWith("/contacts")) return "联系人管理";
    if (pathname.startsWith("/opportunities")) return "商机管理";
    if (pathname.startsWith("/profile")) return "个人中心";
    return "Pury CRM";
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light" width={200}>
        <div className="h-16 flex items-center justify-center border-b">
          <span className="text-xl font-bold">Pury CRM</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          style={{ height: "100%", borderRight: 0 }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b flex items-center justify-between px-6">
          <div className="text-lg font-medium">{getTitle()}</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">管理员</span>
            <LogoutOutlined className="cursor-pointer" onClick={handleLogout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
