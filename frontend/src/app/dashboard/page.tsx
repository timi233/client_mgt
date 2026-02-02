"use client";

import { Layout, Menu } from "antd";
import { 
  DashboardOutlined, 
  UserOutlined, 
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined
} from "@ant-design/icons";

const { Header, Sider, Content } = Layout;

export default function DashboardPage() {
  const menuItems = [
    {
      key: "dashboard",
      icon: <DashboardOutlined />,
      label: "仪表盘",
    },
    {
      key: "customers",
      icon: <ShopOutlined />,
      label: "客户管理",
    },
    {
      key: "opportunities",
      icon: <FileTextOutlined />,
      label: "商机管理",
    },
    {
      key: "team",
      icon: <TeamOutlined />,
      label: "团队管理",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人中心",
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light" width={200}>
        <div className="h-16 flex items-center justify-center border-b">
          <span className="text-xl font-bold">Pury CRM</span>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={["dashboard"]}
          style={{ height: "100%", borderRight: 0 }}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b flex items-center justify-between px-6">
          <div className="text-lg font-medium">仪表盘</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">管理员</span>
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">欢迎使用 Pury CRM</h2>
            <p className="text-gray-600">
              这是仪表盘页面，即将展示系统概况和统计数据。
            </p>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
