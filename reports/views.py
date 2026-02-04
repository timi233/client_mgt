from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.authentication import MultiAuthentication


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_growth(request):
    """
    Get customer growth data by month
    """
    data = {
        "monthly": [
            {"month": "2024-10", "count": 12},
            {"month": "2024-11", "count": 18},
            {"month": "2024-12", "count": 25},
            {"month": "2025-01", "count": 32},
        ]
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_ranking(request):
    """
    Get sales ranking by user
    """
    data = {
        "ranking": [
            {"name": "张三", "amount": 150000},
            {"name": "李四", "amount": 120000},
            {"name": "王五", "amount": 98000},
            {"name": "赵六", "amount": 85000},
        ]
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def lead_conversion(request):
    """
    Get lead conversion rate by status
    """
    data = {
        "by_status": [
            {"status": "new", "count": 45},
            {"status": "contacted", "count": 28},
            {"status": "qualified", "count": 18},
            {"status": "lost", "count": 12},
            {"status": "converted", "count": 8},
        ]
    }
    return Response(data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def sales_trend(request):
    """
    Get sales trend over time
    """
    data = {
        "trend": [
            {"date": "2024-10-01", "amount": 45000},
            {"date": "2024-11-01", "amount": 62000},
            {"date": "2024-12-01", "amount": 78000},
            {"date": "2025-01-01", "amount": 95000},
        ]
    }
    return Response(data)
