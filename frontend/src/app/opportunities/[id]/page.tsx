"use client";

import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  List,
  Avatar,
  Select,
  message,
} from "antd";
import {
  ShopOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import { opportunityAPI } from "@/lib/api-client";

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

interface Contact {
  id: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
}

interface FollowUp {
  id: string;
  content: string;
  created_at: string;
  created_by: any;
}

export default function OpportunityDetailPage() {
  const router = useRouter();
  const params = useParams();
  const opportunityId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [stageLoading, setStageLoading] = useState(false);
  const [opportunity, setOpportunity] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    fetchOpportunityDetail();
  }, [opportunityId]);

  const fetchOpportunityDetail = async () => {
    setLoading(true);
    try {
      const res = await opportunityAPI.detail(opportunityId);
      setOpportunity(res.data);
      setSelectedStage(res.data.stage);
      setContacts(res.data.contacts || []);
      setFollowUps(res.data.follow_ups || []);
    } catch (error) {
      console.error("Failed to fetch opportunity detail:", error);
    } finally {
      setLoading(false);
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

  const handleStageChange = async () => {
    if (!selectedStage) return;
    setStageLoading(true);
    try {
      await opportunityAPI.changeStage(opportunityId, selectedStage);
      message.success("阶段更新成功");
      fetchOpportunityDetail();
    } catch (error) {
      message.error("阶段更新失败");
      console.error("Failed to update stage:", error);
    } finally {
      setStageLoading(false);
    }
  };

  const handleMarkWon = async () => {
    setStageLoading(true);
    try {
      await opportunityAPI.markWon(opportunityId);
      message.success("已标记为成交");
      fetchOpportunityDetail();
    } catch (error) {
      message.error("标记失败");
      console.error("Failed to mark as won:", error);
    } finally {
      setStageLoading(false);
    }
  };

  const handleMarkLost = async () => {
    setStageLoading(true);
    try {
      await opportunityAPI.markLost(opportunityId);
      message.success("已标记为失败");
      fetchOpportunityDetail();
    } catch (error) {
      message.error("标记失败");
      console.error("Failed to mark as lost:", error);
    } finally {
      setStageLoading(false);
    }
  };

  const contactColumns = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "职位",
      dataIndex: "position",
      key: "position",
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "电话",
      dataIndex: "phone",
      key: "phone",
    },
  ];

  const stageMap: Record<string, { color: string; text: string }> = {
    prospecting: { color: "default", text: "挖掘" },
    qualification: { color: "blue", text: "资格" },
    proposal: { color: "orange", text: "方案" },
    negotiation: { color: "purple", text: "谈判" },
    closed_won: { color: "green", text: "成交" },
    closed_lost: { color: "red", text: "失败" },
    on_hold: { color: "geekblue", text: "搁置" },
  };

  if (loading) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content className="flex items-center justify-center">
          <div>加载中...</div>
        </Content>
      </Layout>
    );
  }

  if (!opportunity) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content className="flex items-center justify-center">
          <div>商机不存在</div>
        </Content>
      </Layout>
    );
  }

  const currentStage = stageMap[opportunity.stage] || { color: "default", text: opportunity.stage };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light" width={200}>
        <div className="h-16 flex items-center justify-center border-b">
          <span className="text-xl font-bold">Pury CRM</span>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={["opportunities"]}
          style={{ height: "100%", borderRight: 0 }}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
              返回
            </Button>
            <div className="text-lg font-medium">商机详情</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">管理员</span>
            <LogoutOutlined className="cursor-pointer" onClick={handleLogout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <Card title="基本信息" className="mb-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="商机名称">{opportunity.name}</Descriptions.Item>
              <Descriptions.Item label="客户">{opportunity.customer?.name || "未关联"}</Descriptions.Item>
              <Descriptions.Item label="当前阶段">
                <Tag color={currentStage.color}>{currentStage.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="金额">
                ¥{opportunity.amount?.toLocaleString() || 0}
              </Descriptions.Item>
              <Descriptions.Item label="预计成交日期">
                {opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toLocaleDateString("zh-CN") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="负责人">
                {opportunity.owner?.display_name || opportunity.owner?.username || "未分配"}
              </Descriptions.Item>
              <Descriptions.Item label="成交概率">
                {opportunity.probability !== undefined ? `${opportunity.probability}%` : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {opportunity.created_at ? new Date(opportunity.created_at).toLocaleDateString("zh-CN") : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {opportunity.notes || "无"}
              </Descriptions.Item>
            </Descriptions>

            <div className="mt-4 flex gap-4 flex-wrap items-center">
              <Space>
                <span>更改阶段：</span>
                <Select
                  style={{ width: 150 }}
                  value={selectedStage}
                  onChange={setSelectedStage}
                >
                  <Option value="prospecting">挖掘</Option>
                  <Option value="qualification">资格</Option>
                  <Option value="proposal">方案</Option>
                  <Option value="negotiation">谈判</Option>
                  <Option value="closed_won">成交</Option>
                  <Option value="closed_lost">失败</Option>
                  <Option value="on_hold">搁置</Option>
                </Select>
                <Button type="primary" onClick={handleStageChange} loading={stageLoading}>
                  更新阶段
                </Button>
              </Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleMarkWon}
                loading={stageLoading}
                className="bg-green-500"
              >
                标记成交
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={handleMarkLost}
                loading={stageLoading}
              >
                标记失败
              </Button>
            </div>
          </Card>

          <Card>
            <Tabs defaultActiveKey="contacts">
              <TabPane tab={`关联联系人 (${contacts.length})`} key="contacts">
                <Table
                  columns={contactColumns}
                  dataSource={contacts}
                  rowKey="id"
                  pagination={false}
                />
              </TabPane>
              <TabPane tab={`跟进记录 (${followUps.length})`} key="followups">
                <List
                  itemLayout="horizontal"
                  dataSource={followUps}
                  renderItem={(item: FollowUp) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar>
                            {item.created_by?.display_name?.[0] || item.created_by?.username?.[0] || "?"}
                          </Avatar>
                        }
                        title={
                          <Space>
                            <span>{item.created_by?.display_name || item.created_by?.username}</span>
                            <span className="text-gray-400">
                              {new Date(item.created_at).toLocaleString("zh-CN")}
                            </span>
                          </Space>
                        }
                        description={item.content}
                      />
                    </List.Item>
                  )}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}
