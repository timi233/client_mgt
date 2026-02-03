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
  Modal,
  Form,
  Input,
  Select,
  message,
} from "antd";
import {
  ShopOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  DashboardOutlined,
  PhoneOutlined,
  MailOutlined,
  LogoutOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import { contactAPI, customerAPI, opportunityAPI } from "@/lib/api-client";

const { Header, Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Option } = Select;

interface Customer {
  id: string;
  name: string;
}

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  amount: number;
  expected_close_date?: string;
}

interface Contact {
  id: string;
  name: string;
  job_title: string;
  mobile?: string;
  email?: string;
  notes?: string;
  customer?: string;
  customer_name?: string;
  created_at: string;
  updated_at: string;
}

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
    fetchContactDetail();
  }, [contactId]);

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.list({ page_size: 1000 });
      setCustomerOptions(res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchContactDetail = async () => {
    setLoading(true);
    try {
      const res = await contactAPI.detail(contactId);
      const contactData = res.data;
      setContact(contactData);
      setCustomers(contactData.customer ? [{ id: contactData.customer, name: contactData.customer_name }] : []);
      form.setFieldsValue({
        ...contactData,
        customer: contactData.customer,
      });
      if (contactData.customer) {
        fetchOpportunities(contactData.customer);
      }
    } catch (error) {
      console.error("Failed to fetch contact detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpportunities = async (customerId: string) => {
    try {
      const res = await opportunityAPI.list({ customer: customerId, page_size: 100 });
      setOpportunities(res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
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
      key: "contacts",
      icon: <TeamOutlined />,
      label: "联系人管理",
    },
    {
      key: "opportunities",
      icon: <FileTextOutlined />,
      label: "商机管理",
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

  const handleEdit = async (values: any) => {
    try {
      await contactAPI.update(contactId, values);
      message.success("联系人更新成功");
      setIsEditModalVisible(false);
      fetchContactDetail();
    } catch (error) {
      message.error("联系人更新失败");
    }
  };

  const handleDelete = async () => {
    try {
      await contactAPI.delete(contactId);
      message.success("联系人删除成功");
      router.push("/contacts");
    } catch (error) {
      message.error("联系人删除失败");
    }
  };

  const customerColumns = [
    {
      title: "客户名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Customer) => (
        <a onClick={() => router.push(`/customers/${record.id}`)}>{text}</a>
      ),
    },
  ];

  const opportunityColumns = [
    {
      title: "商机名称",
      dataIndex: "name",
      key: "name",
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
          prospecting: { color: "default", text: "初步接触" },
          qualification: { color: "blue", text: "资格确认" },
          proposal: { color: "orange", text: "方案提交" },
          negotiation: { color: "purple", text: "谈判中" },
          closed_won: { color: "green", text: "已成交" },
          closed_lost: { color: "red", text: "已失败" },
          on_hold: { color: "gray", text: "暂停" },
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
      <Layout style={{ minHeight: "100vh" }}>
        <Content className="flex items-center justify-center">
          <div>加载中...</div>
        </Content>
      </Layout>
    );
  }

  if (!contact) {
    return (
      <Layout style={{ minHeight: "100vh" }}>
        <Content className="flex items-center justify-center">
          <div>联系人不存在</div>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider theme="light" width={200}>
        <div className="h-16 flex items-center justify-center border-b">
          <span className="text-xl font-bold">Pury CRM</span>
        </div>
        <Menu
          mode="inline"
          defaultSelectedKeys={["contacts"]}
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
            <div className="text-lg font-medium">联系人详情</div>
          </div>
          <div className="flex items-center gap-4">
            <Button icon={<EditOutlined />} onClick={() => setIsEditModalVisible(true)}>
              编辑
            </Button>
            <Button icon={<DeleteOutlined />} danger onClick={() => setIsDeleteModalVisible(true)}>
              删除
            </Button>
            <span className="text-gray-600">管理员</span>
            <LogoutOutlined className="cursor-pointer" onClick={handleLogout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <Card title="基本信息" className="mb-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="姓名">{contact.name}</Descriptions.Item>
              <Descriptions.Item label="职位">{contact.job_title}</Descriptions.Item>
              <Descriptions.Item label="电话">
                <Space>
                  <PhoneOutlined />
                  {contact.mobile || "未设置"}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="邮箱">
                <Space>
                  <MailOutlined />
                  {contact.email || "未设置"}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="关联客户" span={2}>
                {contact.customer ? (
                  <a onClick={() => router.push(`/customers/${contact.customer}`)}>
                    <Tag color="blue">{contact.customer_name}</Tag>
                  </a>
                ) : (
                  "未关联"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {contact.notes || "无"}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(contact.created_at).toLocaleString("zh-CN")}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {new Date(contact.updated_at).toLocaleString("zh-CN")}
              </Descriptions.Item>
            </Descriptions>
          </Card>

          <Card>
            <Tabs defaultActiveKey="customers">
              <TabPane tab={`关联客户 (${customers.length})`} key="customers">
                <Table
                  columns={customerColumns}
                  dataSource={customers}
                  rowKey="id"
                  pagination={false}
                />
              </TabPane>
              <TabPane tab={`关联商机 (${opportunities.length})`} key="opportunities">
                <Table
                  columns={opportunityColumns}
                  dataSource={opportunities}
                  rowKey="id"
                  pagination={false}
                />
              </TabPane>
            </Tabs>
          </Card>
        </Content>
      </Layout>

      <Modal
        title="编辑联系人"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
        >
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            name="job_title"
            label="职位"
            rules={[{ required: true, message: "请输入职位" }]}
          >
            <Input placeholder="请输入职位" />
          </Form.Item>
          <Form.Item name="mobile" label="电话">
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item name="email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item name="customer" label="关联客户">
            <Select placeholder="请选择客户" allowClear>
              {customerOptions.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="确认删除"
        open={isDeleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
        okText="删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>确定要删除联系人 "{contact.name}" 吗？此操作不可恢复。</p>
      </Modal>
    </Layout>
  );
}
