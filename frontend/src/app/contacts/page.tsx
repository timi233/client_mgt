"use client";

import { useState, useEffect } from "react";
import {
  Layout,
  Menu,
  Table,
  Input,
  Button,
  Space,
  Card,
  Select,
  Tag,
  Modal,
  Form,
  message,
} from "antd";
import {
  ShopOutlined,
  FileTextOutlined,
  TeamOutlined,
  UserOutlined,
  DashboardOutlined,
  SearchOutlined,
  PlusOutlined,
  LogoutOutlined,
  PhoneOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { contactAPI, customerAPI } from "@/lib/api-client";

const { Header, Sider, Content } = Layout;
const { Search } = Input;
const { Option } = Select;

interface Contact {
  id: string;
  name: string;
  job_title: string;
  mobile?: string;
  email?: string;
  customer_name?: string;
  created_at?: string;
}

export default function ContactListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: "", customer: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [pagination.current, pagination.pageSize, filters.search, filters.customer]);

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.list({ page_size: 1000 });
      setCustomers(res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await contactAPI.list({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters,
      });
      setContacts(res.data.results || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.count || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleCustomerChange = (value: string) => {
    setFilters((prev) => ({ ...prev, customer: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
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

  const columns = [
    {
      title: "姓名",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: Contact) => (
        <a onClick={() => router.push(`/contacts/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "职位",
      dataIndex: "job_title",
      key: "job_title",
    },
    {
      title: "电话",
      dataIndex: "mobile",
      key: "mobile",
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          {phone || "未设置"}
        </Space>
      ),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
      render: (email: string) => (
        <Space>
          <MailOutlined />
          {email || "未设置"}
        </Space>
      ),
    },
    {
      title: "关联客户",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (name: string) => (
        <Tag color="blue">{name || "未关联"}</Tag>
      ),
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => date ? new Date(date).toLocaleDateString("zh-CN") : "-",
    },
    {
      title: "操作",
      key: "action",
      render: (text: string, record: Contact) => (
        <Space size="middle">
          <a onClick={() => router.push(`/contacts/${record.id}`)}>查看</a>
        </Space>
      ),
    },
  ];

  const handleCreateContact = async (values: any) => {
    try {
      await contactAPI.create(values);
      message.success("联系人创建成功");
      setIsModalVisible(false);
      form.resetFields();
      fetchContacts();
    } catch (error) {
      message.error("联系人创建失败");
    }
  };

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
          <div className="text-lg font-medium">联系人管理</div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">管理员</span>
            <LogoutOutlined className="cursor-pointer" onClick={handleLogout} />
          </div>
        </Header>
        <Content className="bg-gray-50 p-6">
          <Card>
            <div className="mb-4 flex gap-4 flex-wrap">
              <Search
                placeholder="搜索姓名/电话/邮箱"
                allowClear
                style={{ width: 300 }}
                onSearch={handleSearch}
                prefix={<SearchOutlined />}
              />
              <Select
                placeholder="选择客户"
                allowClear
                style={{ width: 200 }}
                onChange={handleCustomerChange}
              >
                {customers.map((c) => (
                  <Option key={c.id} value={c.id}>{c.name}</Option>
                ))}
              </Select>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
                新建联系人
              </Button>
            </div>
            <Table
              columns={columns}
              dataSource={contacts}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page, pageSize) => {
                  setPagination((prev) => ({ ...prev, current: page, pageSize }));
                },
              }}
            />
          </Card>

          <Modal
            title="新建联系人"
            open={isModalVisible}
            onCancel={() => setIsModalVisible(false)}
            onOk={() => form.submit()}
            okText="创建"
            cancelText="取消"
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateContact}
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
                  {customers.map((c) => (
                    <Option key={c.id} value={c.id}>{c.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}
