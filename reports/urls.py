from django.urls import path
from reports import views

urlpatterns = [
    path("customer_growth/", views.customer_growth),
    path("sales_ranking/", views.sales_ranking),
    path("lead_conversion/", views.lead_conversion),
    path("sales_trend/", views.sales_trend),
]
