"use client";

import { Card, Statistic, Row, Col, Spin, Button, Space } from "antd";
import {
  ShopOutlined,
  FileTextOutlined,
  DollarOutlined,
  PlusCircleOutlined,
  CustomerServiceOutlined,
  UserAddOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { useState, useEffect } from "react";
import { customerAPI, opportunityAPI } from "@/lib/api-client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
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
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <Row gutter={16} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="客户总数"
              value={stats.totalCustomers}
              prefix={<ShopOutlined />}
              styles={{ content: { color: "#3f8600" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="商机总数"
              value={stats.totalOpportunities}
              prefix={<FileTextOutlined />}
              styles={{ content: { color: "#cf1322" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月新增客户"
              value={stats.newCustomersThisMonth}
              prefix={<PlusCircleOutlined />}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="本月成交金额"
              value={stats.monthlyRevenue}
              prefix={<DollarOutlined />}
              precision={2}
              styles={{ content: { color: "#1890ff" } }}
            />
          </Card>
        </Col>
      </Row>
      <Card title="快速操作" className="mb-6">
        <Space size="middle" wrap>
          <Button type="primary" icon={<UserAddOutlined />} href="/customers/create">
            新建客户
          </Button>
          <Button icon={<SolutionOutlined />} href="/opportunities/create">
            新建商机
          </Button>
          <Button icon={<CustomerServiceOutlined />} href="/leads/create">
            新建线索
          </Button>
          <Button icon={<ShopOutlined />} href="/customers">
            客户列表
          </Button>
          <Button icon={<FileTextOutlined />} href="/opportunities">
            商机列表
          </Button>
          <Button icon={<CustomerServiceOutlined />} href="/leads">
            线索列表
          </Button>
        </Space>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold mb-4">欢迎使用 Pury CRM</h2>
        <p className="text-gray-600">
          这是仪表盘页面，展示系统概况和统计数据。您可以通过左侧导航访问各个功能模块。
        </p>
      </Card>
    </>
  );
}
