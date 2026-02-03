"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Tabs,
  List,
  Avatar,
  Spin,
} from "antd";
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ArrowLeftOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import { customerAPI } from "@/lib/api-client";

const { TabPane } = Tabs;

interface Contact {
  id: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
}

interface Opportunity {
  id: string;
  title: string;
  stage: string;
  amount: number;
  expected_close_date: string;
}

interface FollowUp {
  id: string;
  content: string;
  created_at: string;
  created_by: any;
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState<any>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    fetchCustomerDetail();
  }, [customerId]);

  const fetchCustomerDetail = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.detail(customerId);
      setCustomer(res.data);
      setContacts(res.data.contacts || []);
      setOpportunities(res.data.opportunities || []);
      setFollowUps(res.data.follow_ups || []);
    } catch (error) {
      console.error("Failed to fetch customer detail:", error);
    } finally {
      setLoading(false);
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
    {
      title: "操作",
      key: "action",
      render: () => (
        <Space size="middle">
          <a>编辑</a>
          <a>删除</a>
        </Space>
      ),
    },
  ];

  const opportunityColumns = [
    {
      title: "商机名称",
      dataIndex: "title",
      key: "title",
      render: (text: string, record: Opportunity) => (
        <a onClick={() => router.push(`/opportunities/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => {
        const stageMap: Record<string, { color: string; text: string }> = {
          lead: { color: "default", text: "线索" },
          qualified: { color: "blue", text: "合格" },
          proposal: { color: "orange", text: "方案" },
          negotiation: { color: "purple", text: "谈判" },
          won: { color: "green", text: "成交" },
          lost: { color: "red", text: "失败" },
        };
        const s = stageMap[stage] || { color: "default", text: stage };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: "金额",
      dataIndex: "amount",
      key: "amount",
      render: (amount: number) => `¥${amount?.toLocaleString() || 0}`,
    },
    {
      title: "预计成交日期",
      dataIndex: "expected_close_date",
      key: "expected_close_date",
      render: (date: string) => date ? new Date(date).toLocaleDateString("zh-CN") : "-",
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <div>客户不存在</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <Button className="ml-2" icon={<EditOutlined />} onClick={() => router.push(`/customers/${customerId}/edit`)}>
          编辑
        </Button>
      </div>
      <Card title="基本信息" className="mb-6">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="客户名称">{customer.name}</Descriptions.Item>
          <Descriptions.Item label="行业">{customer.industry || "未设置"}</Descriptions.Item>
          <Descriptions.Item label="规模">
            <Tag color={
              customer.scale === "large" ? "red" :
              customer.scale === "medium" ? "orange" :
              customer.scale === "small" ? "green" : "default"
            }>
              {customer.scale === "large" ? "大型" :
               customer.scale === "medium" ? "中型" :
               customer.scale === "small" ? "小型" : "未设置"}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {customer.owner?.display_name || customer.owner?.username || "未分配"}
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            <Space>
              <PhoneOutlined />
              {customer.phone || "未设置"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Space>
              <MailOutlined />
              {customer.email || "未设置"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="地址" span={2}>
            <Space>
              <EnvironmentOutlined />
              {customer.address || "未设置"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {customer.notes || "无"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card>
        <Tabs defaultActiveKey="contacts">
          <TabPane tab={`联系人 (${contacts.length})`} key="contacts">
            <Table
              columns={contactColumns}
              dataSource={contacts}
              rowKey="id"
              pagination={false}
            />
          </TabPane>
          <TabPane tab={`商机 (${opportunities.length})`} key="opportunities">
            <Table
              columns={opportunityColumns}
              dataSource={opportunities}
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
    </>
  );
}
