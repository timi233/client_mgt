"use client";

import { Form, Input, Button, Card, Divider, message } from "antd";
import { UserOutlined, LockOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch("/api/v1/accounts/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: values.username,
          password: values.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        message.error(errorData.detail || "登录失败，请检查用户名和密码");
        setLoading(false);
        return;
      }

      const data = await response.json();
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));
      message.success("登录成功");
      router.push("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      message.error("登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleFeishuLogin = () => {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    window.location.href = `${protocol}//${host}:8000/api/v1/feishu/login/`;
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
            <Button type="default" htmlType="submit" block loading={loading}>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
