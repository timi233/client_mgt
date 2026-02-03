"use client";

import { useState, useEffect } from "react";
import {
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
  Popconfirm,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
  PhoneOutlined,
  UserOutlined,
  DeleteOutlined,
  CheckSquareOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { leadAPI, customerAPI } from "@/lib/api-client";

const { Search } = Input;
const { Option } = Select;

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  source: string;
  status: string;
  created_at: string;
  owner?: {
    id: string;
    display_name: string;
  };
}

interface User {
  id: string;
  display_name: string;
  username: string;
}

export default function LeadListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: "", source: "", status: "" });
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm();

  useEffect(() => {
    fetchCustomers();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [pagination.current, pagination.pageSize, filters.search, filters.source, filters.status]);

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.list({ page_size: 1000 });
      setCustomers(res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/v1/users/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });
      const data = await res.json();
      setUsers(data.results || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await leadAPI.list({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters,
      });
      setLeads(res.data.results || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.count || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleSourceChange = (value: string) => {
    setFilters((prev) => ({ ...prev, source: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleStatusChange = (value: string) => {
    setFilters((prev) => ({ ...prev, status: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: "公司名称",
      dataIndex: "company_name",
      key: "company_name",
      render: (text: string, record: Lead) => (
        <a onClick={() => router.push(`/leads/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "联系人",
      dataIndex: "contact_name",
      key: "contact_name",
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text || "-"}
        </Space>
      ),
    },
    {
      title: "电话",
      dataIndex: "contact_phone",
      key: "contact_phone",
      render: (phone: string) => (
        <Space>
          <PhoneOutlined />
          {phone || "-"}
        </Space>
      ),
    },
    {
      title: "来源",
      dataIndex: "source",
      key: "source",
      render: (source: string) => {
        const sourceMap: Record<string, { color: string; text: string }> = {
          website: { color: "blue", text: "官网" },
          referral: { color: "green", text: "推荐" },
          exhibition: { color: "orange", text: "展会" },
          advertisement: { color: "purple", text: "广告" },
          cold_call: { color: "geekblue", text: "陌生拜访" },
          social_media: { color: "cyan", text: "社交媒体" },
          other: { color: "default", text: "其他" },
        };
        const s = sourceMap[source] || { color: "default", text: source || "未设置" };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          new: { color: "blue", text: "新建" },
          contacted: { color: "orange", text: "已联系" },
          qualified: { color: "green", text: "合格" },
          lost: { color: "red", text: "失败" },
          converted: { color: "purple", text: "已转化" },
        };
        const s = statusMap[status] || { color: "default", text: status || "未设置" };
        return <Tag color={s.color}>{s.text}</Tag>;
      },
    },
    {
      title: "负责人",
      dataIndex: "owner",
      key: "owner",
      render: (owner: any) => owner?.display_name || owner?.username || "未分配",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      key: "created_at",
      render: (date: string) => (date ? new Date(date).toLocaleDateString("zh-CN") : "-"),
    },
    {
      title: "操作",
      key: "action",
      render: (text: string, record: Lead) => (
        <Space size="middle">
          <a onClick={() => router.push(`/leads/${record.id}`)}>查看</a>
        </Space>
      ),
    },
  ];

  const handleCreateLead = async (values: any) => {
    try {
      await leadAPI.create(values);
      message.success("线索创建成功");
      setIsModalVisible(false);
      form.resetFields();
      fetchLeads();
    } catch (error) {
      message.error("线索创建失败");
    }
  };

  const handleBatchDelete = async () => {
    try {
      await leadAPI.batchDelete(selectedRowKeys as string[]);
      message.success("批量删除成功");
      setSelectedRowKeys([]);
      fetchLeads();
    } catch (error) {
      message.error("批量删除失败");
    }
  };

  const handleBatchAssign = async (values: any) => {
    try {
      await leadAPI.batchAssign(selectedRowKeys as string[], values.owner);
      message.success("批量分配成功");
      setIsAssignModalVisible(false);
      assignForm.resetFields();
      setSelectedRowKeys([]);
      fetchLeads();
    } catch (error) {
      message.error("批量分配失败");
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  return (
    <>
      <Card>
        <div className="mb-4 flex gap-4 flex-wrap items-center">
          <Search
            placeholder="搜索公司名/联系人/电话"
            allowClear
            style={{ width: 300 }}
            onSearch={handleSearch}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="选择来源"
            allowClear
            style={{ width: 150 }}
            onChange={handleSourceChange}
          >
            <Option value="website">官网</Option>
            <Option value="referral">推荐</Option>
            <Option value="exhibition">展会</Option>
            <Option value="advertisement">广告</Option>
            <Option value="cold_call">陌生拜访</Option>
            <Option value="social_media">社交媒体</Option>
            <Option value="other">其他</Option>
          </Select>
          <Select
            placeholder="选择状态"
            allowClear
            style={{ width: 150 }}
            onChange={handleStatusChange}
          >
            <Option value="new">新建</Option>
            <Option value="contacted">已联系</Option>
            <Option value="qualified">合格</Option>
            <Option value="lost">失败</Option>
            <Option value="converted">已转化</Option>
          </Select>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            新建线索
          </Button>
          <Space className="ml-auto">
            {selectedRowKeys.length > 0 && (
              <>
                <Button icon={<CheckSquareOutlined />} onClick={() => setIsAssignModalVisible(true)}>
                  批量分配
                </Button>
                <Popconfirm
                  title="确定删除选中的线索吗？"
                  onConfirm={handleBatchDelete}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除 ({selectedRowKeys.length})
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
        <Table
          columns={columns}
          dataSource={leads}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
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
        title="新建线索"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleCreateLead}>
          <Form.Item
            name="company_name"
            label="公司名称"
            rules={[{ required: true, message: "请输入公司名称" }]}
          >
            <Input placeholder="请输入公司名称" />
          </Form.Item>
          <Form.Item
            name="contact_name"
            label="联系人"
            rules={[{ required: true, message: "请输入联系人" }]}
          >
            <Input placeholder="请输入联系人" />
          </Form.Item>
          <Form.Item
            name="contact_phone"
            label="电话"
            rules={[{ required: true, message: "请输入电话" }]}
          >
            <Input placeholder="请输入电话" />
          </Form.Item>
          <Form.Item name="contact_email" label="邮箱">
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            name="source"
            label="来源"
            rules={[{ required: true, message: "请选择来源" }]}
          >
            <Select placeholder="请选择来源">
              <Option value="website">官网</Option>
              <Option value="referral">推荐</Option>
              <Option value="exhibition">展会</Option>
              <Option value="advertisement">广告</Option>
              <Option value="cold_call">陌生拜访</Option>
              <Option value="social_media">社交媒体</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={4} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="批量分配"
        open={isAssignModalVisible}
        onCancel={() => setIsAssignModalVisible(false)}
        onOk={() => assignForm.submit()}
        okText="分配"
        cancelText="取消"
      >
        <Form form={assignForm} layout="vertical" onFinish={handleBatchAssign}>
          <Form.Item
            name="owner"
            label="选择负责人"
            rules={[{ required: true, message: "请选择负责人" }]}
          >
            <Select placeholder="请选择负责人">
              {users.map((user) => (
                <Option key={user.id} value={user.id}>
                  {user.display_name || user.username}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
