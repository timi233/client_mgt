"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Input,
  Button,
  Card,
  Select,
  Tag,
} from "antd";
import {
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { opportunityAPI, customerAPI } from "@/lib/api-client";

const { Search } = Input;
const { Option } = Select;

export default function OpportunityListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({ search: "", stage: "", customer: "", minAmount: "", maxAmount: "" });

  useEffect(() => {
    fetchOpportunities();
  }, [pagination.current, pagination.pageSize, filters]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: pagination.current,
        page_size: pagination.pageSize,
      };
      if (filters.search) params.search = filters.search;
      if (filters.stage) params.stage = filters.stage;
      if (filters.customer) params.customer = filters.customer;
      if (filters.minAmount) params.amount_min = filters.minAmount;
      if (filters.maxAmount) params.amount_max = filters.maxAmount;

      const res = await opportunityAPI.list(params);
      setOpportunities(res.data.results || []);
      setPagination((prev) => ({
        ...prev,
        total: res.data.count || 0,
      }));
    } catch (error) {
      console.error("Failed to fetch opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await customerAPI.list({ page_size: 1000 });
      setCustomers(res.data.results || []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleStageChange = (value: string) => {
    setFilters((prev) => ({ ...prev, stage: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleCustomerChange = (value: string) => {
    setFilters((prev) => ({ ...prev, customer: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleMinAmountChange = (value: string) => {
    setFilters((prev) => ({ ...prev, minAmount: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleMaxAmountChange = (value: string) => {
    setFilters((prev) => ({ ...prev, maxAmount: value }));
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: "商机名称",
      dataIndex: "name",
      key: "name",
      render: (text: string, record: any) => (
        <a onClick={() => router.push(`/opportunities/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: "客户",
      dataIndex: "customer_name",
      key: "customer_name",
      render: (text: string) => text || "未关联",
    },
    {
      title: "阶段",
      dataIndex: "stage",
      key: "stage",
      render: (stage: string) => {
        const stageMap: Record<string, { color: string; text: string }> = {
          prospecting: { color: "default", text: "挖掘" },
          qualification: { color: "blue", text: "资格" },
          proposal: { color: "orange", text: "方案" },
          negotiation: { color: "purple", text: "谈判" },
          closed_won: { color: "green", text: "成交" },
          closed_lost: { color: "red", text: "失败" },
          on_hold: { color: "geekblue", text: "搁置" },
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
    {
      title: "负责人",
      dataIndex: "owner_name",
      key: "owner_name",
      render: (text: string) => text || "未分配",
    },
  ];

  const handleCreateOpportunity = () => {
    router.push("/opportunities/create");
  };

  return (
    <Card>
      <div className="mb-4 flex gap-4 flex-wrap">
        <Search
          placeholder="搜索商机名称"
          allowClear
          style={{ width: 300 }}
          onSearch={handleSearch}
          prefix={<SearchOutlined />}
        />
        <Select
          placeholder="选择阶段"
          allowClear
          style={{ width: 150 }}
          onChange={handleStageChange}
        >
          <Option value="prospecting">挖掘</Option>
          <Option value="qualification">资格</Option>
          <Option value="proposal">方案</Option>
          <Option value="negotiation">谈判</Option>
          <Option value="closed_won">成交</Option>
          <Option value="closed_lost">失败</Option>
          <Option value="on_hold">搁置</Option>
        </Select>
        <Select
          placeholder="选择客户"
          allowClear
          style={{ width: 200 }}
          onChange={handleCustomerChange}
          showSearch
          optionFilterProp="children"
        >
          {customers.map((customer) => (
            <Option key={customer.id} value={customer.id}>
              {customer.name}
            </Option>
          ))}
        </Select>
        <Input
          placeholder="最小金额"
          type="number"
          style={{ width: 120 }}
          onChange={(e) => handleMinAmountChange(e.target.value)}
          prefix="¥"
        />
        <Input
          placeholder="最大金额"
          type="number"
          style={{ width: 120 }}
          onChange={(e) => handleMaxAmountChange(e.target.value)}
          prefix="¥"
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateOpportunity}>
          新建商机
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={opportunities}
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
