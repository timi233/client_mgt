"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Card,
  Select,
  Tag,
  Space,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { customerAPI } from "@/lib/api-client";

const { Search } = Input;
const { Option } = Select;

export default function CustomerListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: "", industry: "", scale: "" });

  useEffect(() => {
    fetchCustomers();
  }, [pagination.current, pagination.pageSize]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.list({
        page: pagination.current,
        page_size: pagination.pageSize,
        ...filters,
      });
      setCustomers(res.data.results || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.count || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleIndustryChange = (value: string) => {
    setFilters((prev) => ({ ...prev, industry: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleScaleChange = (value: string) => {
    setFilters((prev) => ({ ...prev, scale: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: "客户名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <a onClick={() => router.push(`/customers/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "行业",
      dataIndex: "industry",
      key: "industry",
      render: (text: string) => (
        <Tag color="blue">{text || "未设置"}</Tag>
      ),
    },
    {
      title: "规模",
      dataIndex: "scale",
      key: "scale",
      render: (text: string) => {
        const scaleMap: Record<string, { color: string; text: string }> = {
          small: { color: "green", text: "小型" },
          medium: { color: "orange", text: "中型" },
          large: { color: "red", text: "大型" },
        };
        const scale = scaleMap[text] || { color: "default", text: "未设置" };
        return <Tag color={scale.color}>{scale.text}</Tag>;
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
      render: (date: string) => new Date(date).toLocaleDateString("zh-CN"),
    },
    {
      title: "操作",
      key: "action",
      render: (text: string, record: any) => (
        <Space size="middle">
          <a onClick={() => router.push(`/customers/${record.id}`)}>查看</a>
          <a>编辑</a>
        </Space>
      ),
    },
  ];

  const handleCreateCustomer = () => {
    router.push("/customers/create");
  };

  return (
    <Card>
      <div className="mb-4 flex gap-4 flex-wrap">
        <Search
          placeholder="搜索客户名称"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="选择行业"
          allowClear
          style={{ width: 200 }}
          onChange={handleIndustryChange}
        >
          <Option value="科技">科技</Option>
          <Option value="金融">金融</Option>
          <Option value="制造">制造</Option>
          <Option value="零售">零售</Option>
          <Option value="教育">教育</Option>
          <Option value="医疗">医疗</Option>
        </Select>
        <Select
          placeholder="选择规模"
          allowClear
          style={{ width: 200 }}
          onChange={handleScaleChange}
        >
          <Option value="small">小型</Option>
          <Option value="medium">中型</Option>
          <Option value="large">大型</Option>
        </Select>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateCustomer}>
          新建客户
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={customers}
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
  );
}
