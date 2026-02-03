"use client";

import React, { ReactNode } from "react";
import { useAuth, UserRole, hasPermission } from "@/lib/auth";
import { Tooltip, Button } from "antd";
import { LockOutlined } from "@ant-design/icons";

export interface PermissionGuardProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
  requireAll?: boolean;
  mode?: "hide" | "disable" | "tooltip";
  tooltipTitle?: string;
}

export default function PermissionGuard({
  children,
  allowedRoles,
  requireAll = false,
  mode = "hide",
  tooltipTitle = "您没有权限执行此操作",
}: PermissionGuardProps) {
  const { user } = useAuth();
  const userRole = user?.role || null;

  let hasAccess: boolean;

  if (!allowedRoles) {
    hasAccess = true;
  } else if (requireAll) {
    hasAccess = allowedRoles.includes(userRole as UserRole);
  } else {
    hasAccess = hasPermission(userRole, allowedRoles);
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  switch (mode) {
    case "hide":
      return null;
    case "disable":
      if (React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, {
          disabled: true,
        });
      }
      return null;
    case "tooltip":
      return (
        <Tooltip title={tooltipTitle}>
          {React.isValidElement(children) ? (
            React.cloneElement(children as React.ReactElement<any>, {
              disabled: true,
              icon: <LockOutlined />,
            })
          ) : (
            children
          )}
        </Tooltip>
      );
    default:
      return null;
  }
}

export function PermissionButton({
  children,
  allowedRoles,
  requireAll = false,
  tooltipTitle = "您没有权限执行此操作",
  ...props
}: any) {
  const { user } = useAuth();
  const userRole = user?.role || null;

  let hasAccess: boolean;

  if (!allowedRoles) {
    hasAccess = true;
  } else if (requireAll) {
    hasAccess = allowedRoles.includes(userRole as UserRole);
  } else {
    hasAccess = hasPermission(userRole, allowedRoles);
  }

  if (hasAccess) {
    return <Button {...props}>{children}</Button>;
  }

  return (
    <Tooltip title={tooltipTitle}>
      <Button disabled icon={<LockOutlined />} {...props}>
        {children}
      </Button>
    </Tooltip>
  );
}
