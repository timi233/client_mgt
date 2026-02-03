"use client";

import { Layout, Menu, Card, Statistic, Row, Col } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ShopOutlined,
  FileTextOutlined,
  DollarOutlined,
  PlusCircleOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { customerAPI, opportunityAPI } from "@/lib/api-client";

const { Header, Sider, Content } = Layout;

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOpportunities: 0,
    newCustomersThisMonth: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const customersRes = await customerAPI.list();
      const opportunitiesRes = await opportunityAPI.list();

      const customers = customersRes.data.results || [];
      const opportunities = opportunitiesRes.data.results || [];

      const thisMonth = new Date();
      thisMonth.setDate(1);

      const newCustomers = customers.filter((c: any) => {
        const createdAt = new Date(c.created_at);
        return createdAt >= thisMonth;
      });

      const wonOpportunities = opportunities.filter((o: any) => o.stage === "won");
      const monthlyRevenue = wonOpportunities.reduce((sum: number, o: any) => sum + (o.amount || 0), 0);

      setStats({
        totalCustomers: customers.length,
        totalOpportunities: opportunities.length,
        newCustomersThisMonth: newCustomers.length,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

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

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(`/${key}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/login");
  };

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
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b flex items-center justify-between px-6">
          <div className="text-lg font-medium">仪表盘</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">管理员</span>
            <LogoutOutlined className="cursor-pointer" onClick={handleLogout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <Row gutter={16} className="mb-6">
            <Col span={6}>
              <Card>
                <Statistic
                  title="客户总数"
                  value={stats.totalCustomers}
                  prefix={<ShopOutlined />}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="商机总数"
                  value={stats.totalOpportunities}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="本月新增客户"
                  value={stats.newCustomersThisMonth}
                  prefix={<PlusCircleOutlined />}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="本月成交金额"
                  value={stats.monthlyRevenue}
                  prefix={<DollarOutlined />}
                  precision={2}
                  valueStyle={{ color: "#1890ff" }}
                />
              </Card>
            </Col>
          </Row>
          <Card className="mt-6">
            <h2 className="text-xl font-semibold mb-4">欢迎使用 Pury CRM</h2>
            <p className="text-gray-600">
              这是仪表盘页面，展示系统概况和统计数据。您可以通过左侧导航访问各个功能模块。
            </p>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
