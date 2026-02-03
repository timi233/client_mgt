"use client";

import { Form, Input, Button, Card, Divider } from "antd";
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const onFinish = (values: any) => {
    console.log("Received values of form: ", values);
  };

  const handleFeishuLogin = () => {
    window.location.href = "/api/v1/feishu/login/";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Pury CRM
          </h1>
          <p className="text-gray-600 mt-2">登录到系统</p>
        </div>

        <Button
          type="primary"
          icon={<ArrowLeftOutlined />}
          onClick={handleFeishuLogin}
          block
          size="large"
          className="mb-6"
          style={{ backgroundColor: "#00d6b9", borderColor: "#00d6b9" }}
        >
          飞书登录
        </Button>

        <Divider>或</Divider>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
          className="mt-6"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名!" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="用户名"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码!" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
            />
          </Form.Item>
          <Form.Item>
            <Button type="default" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
