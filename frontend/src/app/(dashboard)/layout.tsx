"use client";

import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined,
  LogoutOutlined,
  CustomerServiceOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useRouter, usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth, UserRole } from "@/lib/auth";

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuProps["items"]>([]);

  const getAllMenuItems = (): MenuProps["items"] => [
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
      key: "/reports",
      icon: <BarChartOutlined />,
      label: "报表分析",
    },
    {
      key: "/profile",
      icon: <UserOutlined />,
      label: "个人中心",
    },
  ];

  const filterMenuByRole = (items: MenuProps["items"]): MenuProps["items"] => {
    const roleAccess: Record<string, UserRole[]> = {
      "/dashboard": ["admin", "sales_manager", "sales", "viewer"],
      "/leads": ["admin", "sales_manager", "sales"],
      "/customers": ["admin", "sales_manager", "sales", "viewer"],
      "/contacts": ["admin", "sales_manager", "sales", "viewer"],
      "/opportunities": ["admin", "sales_manager", "sales", "viewer"],
      "/reports": ["admin", "sales_manager", "viewer"],
      "/profile": ["admin", "sales_manager", "sales", "viewer"],
    };

    if (!user) return [];
    if (!items) return [];

    return items.filter((item) => {
      if (!item || typeof item === "string") return false;
      const key = item.key as string;
      const allowedRoles = roleAccess[key];
      return allowedRoles && allowedRoles.includes(user.role as UserRole);
    });
  };

  useEffect(() => {
    const allItems = getAllMenuItems();
    const filteredItems = filterMenuByRole(allItems);
    setMenuItems(filteredItems);
  }, [user]);

  const handleMenuClick: MenuProps["onClick"] = ({ key }) => {
    router.push(key);
  };

  const getSelectedKey = () => {
    if (pathname === "/") return "/dashboard";
    if (pathname.startsWith("/leads")) return "/leads";
    if (pathname.startsWith("/customers")) return "/customers";
    if (pathname.startsWith("/contacts")) return "/contacts";
    if (pathname.startsWith("/opportunities")) return "/opportunities";
    if (pathname.startsWith("/reports")) return "/reports";
    if (pathname.startsWith("/profile")) return "/profile";
    return pathname;
  };

  const getTitle = () => {
    if (pathname === "/" || pathname === "/dashboard") return "仪表盘";
    if (pathname.startsWith("/leads")) return "线索管理";
    if (pathname.startsWith("/customers")) return "客户管理";
    if (pathname.startsWith("/contacts")) return "联系人管理";
    if (pathname.startsWith("/opportunities")) return "商机管理";
    if (pathname.startsWith("/reports")) return "报表分析";
    if (pathname.startsWith("/profile")) return "个人中心";
    return "Pury CRM";
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, string> = {
      admin: "管理员",
      sales_manager: "销售经理",
      sales: "销售人员",
      viewer: "访客",
    };
    return roleLabels[role] || role;
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
            {user && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">
                  {user.display_name || user.username}
                </span>
                <span className="text-sm text-gray-400">
                  ({getRoleLabel(user.role)})
                </span>
              </div>
            )}
            <LogoutOutlined className="cursor-pointer" onClick={logout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
