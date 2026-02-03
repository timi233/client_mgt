"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Select,
  Spin,
  Statistic,
} from "antd";
import {
  LineChartOutlined,
  TrophyOutlined,
  PieChartOutlined,
} from "@ant-design/icons";
import {
  Funnel,
  Column,
  Pie,
  Line,
} from "@ant-design/charts";
import { reportAPI } from "@/lib/api-client";
import dayjs from "dayjs";

const { Option } = Select;

interface PipelineData {
  stage: string;
  value: number;
}

interface GrowthData {
  month: string;
  value: number;
}

interface RankingData {
  name: string;
  value: number;
}

interface ConversionData {
  status: string;
  value: number;
}

interface SalesTrendData {
  date: string;
  value: number;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("month");
  const [pipelineData, setPipelineData] = useState<PipelineData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [rankingData, setRankingData] = useState<RankingData[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [salesTrendData, setSalesTrendData] = useState<SalesTrendData[]>([]);

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPipelineSummary(),
        fetchCustomerGrowth(),
        fetchSalesRanking(),
        fetchLeadConversion(),
        fetchSalesTrend(),
      ]);
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPipelineSummary = async () => {
    try {
      const res = await reportAPI.getPipelineSummary();
      const data = res.data?.stages || [];
      const transformedData = data.map((item: any) => ({
        stage: item.stage,
        value: item.count,
      }));
      setPipelineData(transformedData);
    } catch (error) {
      console.error("Failed to fetch pipeline summary:", error);
    }
  };

  const fetchCustomerGrowth = async () => {
    try {
      const res = await reportAPI.getCustomerGrowth({ time_range: timeRange });
      const data = res.data?.monthly || [];
      const transformedData = data.map((item: any) => ({
        month: item.month,
        value: item.count,
      }));
      setGrowthData(transformedData);
    } catch (error) {
      console.error("Failed to fetch customer growth:", error);
    }
  };

  const fetchSalesRanking = async () => {
    try {
      const res = await reportAPI.getSalesRanking({ time_range: timeRange });
      const data = res.data?.ranking || [];
      const transformedData = data.map((item: any) => ({
        name: item.name || item.username || "未知",
        value: item.amount || 0,
      }));
      setRankingData(transformedData);
    } catch (error) {
      console.error("Failed to fetch sales ranking:", error);
    }
  };

  const fetchLeadConversion = async () => {
    try {
      const res = await reportAPI.getLeadConversion({ time_range: timeRange });
      const data = res.data?.by_status || [];
      const transformedData = data.map((item: any) => ({
        status: item.status,
        value: item.count,
      }));
      setConversionData(transformedData);
    } catch (error) {
      console.error("Failed to fetch lead conversion:", error);
    }
  };

  const fetchSalesTrend = async () => {
    try {
      const res = await reportAPI.getSalesTrend({ time_range: timeRange });
      const data = res.data?.trend || [];
      const transformedData = data.map((item: any) => ({
        date: item.date || item.month,
        value: item.amount || 0,
      }));
      setSalesTrendData(transformedData);
    } catch (error) {
      console.error("Failed to fetch sales trend:", error);
    }
  };

  const stageLabelMap: Record<string, string> = {
    prospecting: "挖掘",
    qualification: "资格",
    proposal: "方案",
    negotiation: "谈判",
    closed_won: "成交",
    closed_lost: "失败",
    on_hold: "搁置",
  };

  const funnelData = pipelineData.map((item) => ({
    stage: stageLabelMap[item.stage] || item.stage,
    value: item.value,
  }));

  const funnelConfig = {
    data: funnelData,
    xField: "stage",
    yField: "value",
    height: 300,
    label: {
      position: "middle",
      style: {
        fill: "#fff",
        opacity: 0.6,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.stage,
        value: datum.value,
      }),
    },
  };

  const growthConfig = {
    data: growthData,
    xField: "month",
    yField: "value",
    height: 300,
    columnWidth: 40,
    label: {
      position: "middle",
      style: {
        fill: "#FFFFFF",
        opacity: 0.6,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: "客户数量",
        value: datum.value,
      }),
    },
  };

  const rankingConfig = {
    data: rankingData,
    xField: "value",
    yField: "name",
    height: 300,
    seriesField: "value",
    label: {
      position: "right",
      style: {
        fill: "#8C8C8C",
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.name,
        value: `¥${datum.value?.toLocaleString()}`,
      }),
    },
  };

  const statusLabelMap: Record<string, string> = {
    new: "新建",
    contacted: "已联系",
    qualified: "合格",
    lost: "失败",
    converted: "已转化",
  };

  const conversionDataTransformed = conversionData.map((item) => ({
    status: statusLabelMap[item.status] || item.status,
    value: item.value,
  }));

  const conversionConfig = {
    data: conversionDataTransformed,
    angleField: "value",
    colorField: "status",
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      type: "outer",
      content: "{name} {percentage}",
      style: {
        fontSize: 14,
      },
    },
    interactions: [
      {
        type: "element-active",
      },
    ],
    height: 300,
    tooltip: {
      formatter: (datum: any) => ({
        name: datum.status,
        value: datum.value,
      }),
    },
  };

  const trendConfig = {
    data: salesTrendData,
    xField: "date",
    yField: "value",
    height: 300,
    smooth: true,
    areaStyle: {
      fill: "l(270) 0:#ffffff 0.5:#7ec2f3 1:#1890ff",
    },
    line: {
      color: "#1890ff",
    },
    point: {
      size: 5,
      shape: "diamond",
      style: {
        fill: "#fff",
        stroke: "#1890ff",
        lineWidth: 2,
      },
    },
    tooltip: {
      formatter: (datum: any) => ({
        name: "销售额",
        value: `¥${datum.value?.toLocaleString()}`,
      }),
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "400px" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4">
        <Select
          value={timeRange}
          onChange={setTimeRange}
          style={{ width: 200 }}
        >
          <Option value="month">本月</Option>
          <Option value="quarter">本季度</Option>
          <Option value="year">本年</Option>
        </Select>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="商机漏斗图">
            <Funnel {...funnelConfig} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <PieChartOutlined /> 线索转化率
              </span>
            }
          >
            <Pie {...conversionConfig} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <LineChartOutlined /> 客户增长趋势
              </span>
            }
          >
            <Column {...growthConfig} />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <span>
                <TrophyOutlined /> 销售业绩排行榜
              </span>
            }
          >
            <Column {...rankingConfig} />
          </Card>
        </Col>

        <Col xs={24}>
          <Card
            title={
              <span>
                <LineChartOutlined /> 销售趋势图
              </span>
            }
          >
            <Line {...trendConfig} />
          </Card>
        </Col>
      </Row>
    </>
  );
}
