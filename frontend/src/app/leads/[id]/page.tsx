"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Descriptions,
  Button,
  Space,
  Tag,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  message,
  Spin,
  List,
  Avatar,
} from "antd";
import {
  PhoneOutlined,
  MailOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  CustomerServiceOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useRouter, useParams } from "next/navigation";
import { leadAPI } from "@/lib/api-client";

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

interface FollowUp {
  id: string;
  content: string;
  created_at: string;
  created_by: {
    id: string;
    display_name: string;
    username: string;
  };
}

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  source: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    display_name: string;
  };
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isConvertModalVisible, setIsConvertModalVisible] = useState(false);
  const [isFollowUpModalVisible, setIsFollowUpModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [convertForm] = Form.useForm();
  const [followUpForm] = Form.useForm();

  useEffect(() => {
    fetchLeadDetail();
  }, [leadId]);

  const fetchLeadDetail = async () => {
    setLoading(true);
    try {
      const res = await leadAPI.detail(leadId);
      setLead(res.data);
      setFollowUps(res.data.follow_ups || []);
      form.setFieldsValue(res.data);
    } catch (error) {
      console.error("Failed to fetch lead detail:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values: any) => {
    try {
      await leadAPI.update(leadId, values);
      message.success("线索更新成功");
      setIsEditModalVisible(false);
      fetchLeadDetail();
    } catch (error) {
      message.error("线索更新失败");
    }
  };

  const handleDelete = async () => {
    try {
      await leadAPI.delete(leadId);
      message.success("线索删除成功");
      router.push("/leads");
    } catch (error) {
      message.error("线索删除失败");
    }
  };

  const handleConvertToCustomer = async (values: any) => {
    try {
      await leadAPI.convertToCustomer(leadId, values);
      message.success("转化成功，正在跳转...");
      setIsConvertModalVisible(false);
      convertForm.resetFields();
      setTimeout(() => {
        router.push("/customers");
      }, 1000);
    } catch (error) {
      message.error("转化失败");
    }
  };

  const handleAddFollowUp = async (values: any) => {
    try {
      await fetch(`/api/v1/customers/leads/${leadId}/follow_ups/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify(values),
      });
      message.success("跟进记录添加成功");
      setIsFollowUpModalVisible(false);
      followUpForm.resetFields();
      fetchLeadDetail();
    } catch (error) {
      message.error("跟进记录添加失败");
    }
  };

  const sourceMap: Record<string, { color: string; text: string }> = {
    website: { color: "blue", text: "官网" },
    referral: { color: "green", text: "推荐" },
    exhibition: { color: "orange", text: "展会" },
    advertisement: { color: "purple", text: "广告" },
    cold_call: { color: "geekblue", text: "陌生拜访" },
    social_media: { color: "cyan", text: "社交媒体" },
    other: { color: "default", text: "其他" },
  };

  const statusMap: Record<string, { color: string; text: string }> = {
    new: { color: "blue", text: "新建" },
    contacted: { color: "orange", text: "已联系" },
    qualified: { color: "green", text: "合格" },
    lost: { color: "red", text: "失败" },
    converted: { color: "purple", text: "已转化" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <div>线索不存在</div>
      </div>
    );
  }

  const source = sourceMap[lead.source] || { color: "default", text: lead.source || "未设置" };
  const status = statusMap[lead.status] || { color: "default", text: lead.status || "未设置" };

  return (
    <>
      <div className="mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>
        <Button className="ml-2" icon={<EditOutlined />} onClick={() => setIsEditModalVisible(true)}>
          编辑
        </Button>
        <Button
          className="ml-2"
          type="primary"
          icon={<CustomerServiceOutlined />}
          onClick={() => setIsConvertModalVisible(true)}
        >
          转化为客户
        </Button>
        <Button className="ml-2" icon={<DeleteOutlined />} danger onClick={() => setIsDeleteModalVisible(true)}>
          删除
        </Button>
      </div>
      <Card title="基本信息" className="mb-6">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="公司名称">{lead.company_name}</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={status.color}>{status.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="联系人">{lead.contact_name}</Descriptions.Item>
          <Descriptions.Item label="来源">
            <Tag color={source.color}>{source.text}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="电话">
            <Space>
              <PhoneOutlined />
              {lead.contact_phone || "未设置"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="邮箱">
            <Space>
              <MailOutlined />
              {lead.contact_email || "未设置"}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="负责人">
            {lead.owner?.display_name || "未分配"}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {new Date(lead.created_at).toLocaleString("zh-CN")}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={2}>
            {lead.notes || "无"}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        title="跟进记录"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsFollowUpModalVisible(true)}>
            添加跟进
          </Button>
        }
      >
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
      </Card>

      <Modal
        title="编辑线索"
        open={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={() => form.submit()}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={handleEdit}>
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
          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: "请选择状态" }]}
          >
            <Select placeholder="请选择状态">
              <Option value="new">新建</Option>
              <Option value="contacted">已联系</Option>
              <Option value="qualified">合格</Option>
              <Option value="lost">失败</Option>
              <Option value="converted">已转化</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={4} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转化为客户"
        open={isConvertModalVisible}
        onCancel={() => setIsConvertModalVisible(false)}
        onOk={() => convertForm.submit()}
        okText="转化"
        cancelText="取消"
      >
        <p>确定要将线索转化为客户吗？</p>
        <Form form={convertForm} layout="vertical" onFinish={handleConvertToCustomer}>
          <Form.Item name="customer_name" label="客户名称">
            <Input placeholder="请输入客户名称（默认为公司名称）" />
          </Form.Item>
          <Form.Item name="industry" label="行业">
            <Select placeholder="请选择行业" allowClear>
              <Option value="科技">科技</Option>
              <Option value="金融">金融</Option>
              <Option value="制造">制造</Option>
              <Option value="零售">零售</Option>
              <Option value="教育">教育</Option>
              <Option value="医疗">医疗</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={4} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="添加跟进记录"
        open={isFollowUpModalVisible}
        onCancel={() => setIsFollowUpModalVisible(false)}
        onOk={() => followUpForm.submit()}
        okText="添加"
        cancelText="取消"
      >
        <Form form={followUpForm} layout="vertical" onFinish={handleAddFollowUp}>
          <Form.Item
            name="content"
            label="跟进内容"
            rules={[{ required: true, message: "请输入跟进内容" }]}
          >
            <TextArea rows={4} placeholder="请输入跟进内容" />
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
        <p>确定要删除线索 "{lead.company_name}" 吗？此操作不可恢复。</p>
      </Modal>
    </>
  );
}
