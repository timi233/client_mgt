from rest_framework import permissions


class IsAccountMember(permissions.BasePermission):
    """
    Check if user belongs to same account as the object.
    """

    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        obj_account = None

        if hasattr(obj, "account"):
            obj_account = obj.account
        elif hasattr(obj, "customer") and hasattr(obj.customer, "account"):
            obj_account = obj.customer.account
        elif hasattr(obj, "owner") and hasattr(obj.owner, "account"):
            obj_account = obj.owner.account
        elif (
            hasattr(obj, "opportunity")
            and hasattr(obj.opportunity, "customer")
            and hasattr(obj.opportunity.customer, "account")
        ):
            obj_account = obj.opportunity.customer.account
        elif hasattr(obj, "pool") and hasattr(obj.pool, "account"):
            obj_account = obj.pool.account

        if obj_account is None:
            return False

        return obj_account == request.user.account


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Allow safe methods for all users, check ownership for unsafe methods.
    """

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return hasattr(obj, "owner") and obj.owner == request.user


class RoleBasedPermission(permissions.BasePermission):
    """
    Base class for role-based permissions.
    Subclasses should define allowed_roles.
    """

    allowed_roles = []

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        return request.user.role in self.allowed_roles


class IsAdminOnly(RoleBasedPermission):
    allowed_roles = ["admin"]


class IsAdminOrSalesManager(RoleBasedPermission):
    allowed_roles = ["admin", "sales_manager"]


class IsSalesOrAbove(RoleBasedPermission):
    allowed_roles = ["admin", "sales_manager", "sales"]
