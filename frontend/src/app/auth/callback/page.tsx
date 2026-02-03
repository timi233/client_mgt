"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import { setToken } from "@/lib/auth";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access) {
      setToken(access);
      if (refresh) {
        localStorage.setItem("refresh_token", refresh);
      }

      const userData = searchParams.get("user");
      if (userData) {
        try {
          localStorage.setItem("user", userData);
        } catch (e) {
          console.error("Failed to save user data:", e);
        }
      }

      router.push("/dashboard");
    } else {
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">登录中，请稍候...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">登录中，请稍候...</p>
        </div>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
