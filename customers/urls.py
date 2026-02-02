from django.urls import path, include
from rest_framework.routers import DefaultRouter

from customers.views import (
    CustomerViewSet,
    ContactViewSet,
    LeadViewSet,
    CustomerPoolViewSet,
    PoolCustomerViewSet,
)

router = DefaultRouter()
router.register(r"customers", CustomerViewSet)
router.register(r"contacts", ContactViewSet)
router.register(r"leads", LeadViewSet)
router.register(r"pools", CustomerPoolViewSet)
router.register(r"pool-customers", PoolCustomerViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
