import React, { useState, useEffect, useCallback } from 'react';
import { safeInvoke } from './MockBackend';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Switch,
  Select,
  Space,
  message,
  List,
  Tag,
  Tooltip,
  Alert,
} from 'antd';
import {
  Activity,
  Cpu,
  HardDrive,
  Zap,
  RefreshCw,
  TrendingUp,
  Database,
  Clock,
} from 'lucide-react';
import styled from 'styled-components';
import { logger } from '../utils/logger';

const { Option } = Select;

const MonitorContainer = styled.div`
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
`;

const MetricCard = styled(Card)`
  .ant-card-body {
    padding: 16px;
  }
`;

const StatusIndicator = styled.div<{ status: 'good' | 'warning' | 'critical' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props =>
    props.status === 'good' ? '#52c41a' : props.status === 'warning' ? '#faad14' : '#f5222d'};
  display: inline-block;
  margin-right: 8px;
`;

interface SystemStatus {
  performance_metrics: {
    cpu_usage: number;
    memory_usage: number;
    active_tasks: number;
    cache_hit_rate: number;
    average_response_time: number;
    error_rate: number;
    timestamp: number;
  };
  cache_stats: {
    total_size: number;
    hit_rate: number;
    miss_rate: number;
    evictions: number;
  };
  task_stats: {
    active_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    average_execution_time: number;
  };
  memory_usage: {
    total_allocated: number;
    heap_size: number;
    stack_size: number;
    cache_size: number;
  };
}

interface PerformanceMetrics {
  cpu_usage: number;
  memory_usage: number;
  active_tasks: number;
  cache_hit_rate: number;
  average_response_time: number;
  error_rate: number;
  timestamp: number;
}

const PerformanceMonitor: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // 模拟系统状态（当后端不可用时）
  const getMockSystemStatus = (): SystemStatus => ({
    performance_metrics: {
      cpu_usage: 15.5,
      memory_usage: 25.0,
      active_tasks: 2,
      cache_hit_rate: 0.85,
      average_response_time: 120.5,
      error_rate: 0.02,
      timestamp: Date.now(),
    },
    cache_stats: {
      total_size: 150,
      hit_rate: 0.85,
      miss_rate: 0.15,
      evictions: 5,
    },
    task_stats: {
      active_tasks: 2,
      completed_tasks: 158,
      failed_tasks: 3,
      average_execution_time: 89.2,
    },
    memory_usage: {
      total_allocated: 268435456, // 256MB
      heap_size: 134217728, // 128MB
      stack_size: 8388608, // 8MB
      cache_size: 16777216, // 16MB
    },
  });

  // 获取系统状态
  const fetchSystemStatus = useCallback(async () => {
    try {
      const status = await safeInvoke('get_system_status');
      setSystemStatus(status);
    } catch (error) {
      logger.warn('获取系统状态失败，使用模拟数据:', error);
      setSystemStatus(getMockSystemStatus());
    }
  }, []);

  // 获取性能历史
  const fetchPerformanceHistory = useCallback(async () => {
    try {
      const history = await safeInvoke('get_performance_history');
      setPerformanceHistory(history);
    } catch (error) {
      logger.warn('获取性能历史失败:', error);
      // 生成模拟历史数据
      const mockHistory = Array.from({ length: 10 }, (_, i) => ({
        cpu_usage: 15 + Math.random() * 10,
        memory_usage: 25 + Math.random() * 10,
        active_tasks: Math.floor(Math.random() * 5),
        cache_hit_rate: 0.8 + Math.random() * 0.15,
        average_response_time: 100 + Math.random() * 50,
        error_rate: Math.random() * 0.05,
        timestamp: Date.now() - (10 - i) * 30000,
      }));
      setPerformanceHistory(mockHistory);
    }
  }, []);

  // 自动刷新
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        fetchSystemStatus();
        fetchPerformanceHistory();
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [isMonitoring, refreshInterval, fetchSystemStatus, fetchPerformanceHistory]);

  // 初始加载
  useEffect(() => {
    fetchSystemStatus();
    fetchPerformanceHistory();
  }, [fetchSystemStatus, fetchPerformanceHistory]);

  // 性能优化
  const optimizePerformance = async () => {
    setOptimizing(true);
    try {
      const result = await safeInvoke('optimize_performance');
      message.success('性能优化完成！');
      logger.info('优化结果:', result);

      // 刷新状态
      setTimeout(() => {
        fetchSystemStatus();
        fetchPerformanceHistory();
      }, 1000);
    } catch (error) {
      message.warning('性能优化功能暂时不可用，但界面仍可正常使用');
      logger.warn('优化失败:', error);
    } finally {
      setOptimizing(false);
    }
  };

  // 清空缓存
  const clearCache = async () => {
    setLoading(true);
    try {
      await safeInvoke('clear_cache');
      message.success('缓存已清空');
      fetchSystemStatus();
    } catch (error) {
      message.warning('清空缓存功能暂时不可用');
      logger.warn('清空缓存失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 运行基准测试
  const runBenchmark = async () => {
    setLoading(true);
    try {
      const results = await safeInvoke('run_performance_benchmark');
      message.success('基准测试完成');
      logger.info('基准测试结果:', results);
    } catch (error) {
      message.warning('基准测试功能暂时不可用');
      logger.warn('基准测试失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 预加载资源
  const preloadResources = async () => {
    const resources = ['blockly', 'device_drivers', 'ai_models'];
    try {
      const results = await safeInvoke('preload_resources', { resources });
      const successCount = Object.values(results).filter(Boolean).length;
      message.success(`成功预加载 ${successCount}/${resources.length} 个资源`);
    } catch (error) {
      message.warning('预加载功能暂时不可用');
      logger.warn('预加载失败:', error);
    }
  };

  // 获取状态指示器
  const getStatusIndicator = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return 'good';
    if (value < thresholds[1]) return 'warning';
    return 'critical';
  };

  // 格式化文件大小
  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  if (!systemStatus) {
    return <div>加载中...</div>;
  }

  return (
    <MonitorContainer>
      {/* 控制栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Switch
                checked={isMonitoring}
                onChange={setIsMonitoring}
                checkedChildren="监控中"
                unCheckedChildren="已暂停"
              />

              <Select
                value={refreshInterval}
                onChange={setRefreshInterval}
                style={{ width: 120 }}
                size="small"
              >
                <Option value={1000}>1秒</Option>
                <Option value={5000}>5秒</Option>
                <Option value={10000}>10秒</Option>
                <Option value={30000}>30秒</Option>
              </Select>

              <Button
                icon={<RefreshCw size={14} />}
                size="small"
                onClick={() => {
                  fetchSystemStatus();
                  fetchPerformanceHistory();
                }}
              >
                刷新
              </Button>
            </Space>
          </Col>

          <Col>
            <Space>
              <Button
                type="primary"
                icon={<Zap size={14} />}
                size="small"
                loading={optimizing}
                onClick={optimizePerformance}
              >
                性能优化
              </Button>

              <Button
                icon={<Database size={14} />}
                size="small"
                loading={loading}
                onClick={clearCache}
              >
                清空缓存
              </Button>

              <Button
                icon={<TrendingUp size={14} />}
                size="small"
                loading={loading}
                onClick={runBenchmark}
              >
                基准测试
              </Button>

              <Button icon={<Clock size={14} />} size="small" onClick={preloadResources}>
                预加载
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主要指标 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <MetricCard>
            <Statistic
              title={
                <Space>
                  <Cpu size={16} />
                  <StatusIndicator
                    status={getStatusIndicator(
                      systemStatus.performance_metrics.cpu_usage,
                      [50, 80]
                    )}
                  />
                  CPU使用率
                </Space>
              }
              value={systemStatus.performance_metrics.cpu_usage}
              precision={1}
              suffix="%"
            />
            <Progress
              percent={systemStatus.performance_metrics.cpu_usage}
              size="small"
              status={
                systemStatus.performance_metrics.cpu_usage > 80
                  ? 'exception'
                  : systemStatus.performance_metrics.cpu_usage > 50
                    ? 'active'
                    : 'success'
              }
            />
          </MetricCard>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <MetricCard>
            <Statistic
              title={
                <Space>
                  <HardDrive size={16} />
                  <StatusIndicator
                    status={getStatusIndicator(
                      systemStatus.performance_metrics.memory_usage,
                      [70, 90]
                    )}
                  />
                  内存使用率
                </Space>
              }
              value={systemStatus.performance_metrics.memory_usage}
              precision={1}
              suffix="%"
            />
            <Progress
              percent={systemStatus.performance_metrics.memory_usage}
              size="small"
              status={
                systemStatus.performance_metrics.memory_usage > 90
                  ? 'exception'
                  : systemStatus.performance_metrics.memory_usage > 70
                    ? 'active'
                    : 'success'
              }
            />
          </MetricCard>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <MetricCard>
            <Statistic
              title={
                <Space>
                  <Activity size={16} />
                  活动任务
                </Space>
              }
              value={systemStatus.task_stats.active_tasks}
              suffix="个"
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              已完成: {systemStatus.task_stats.completed_tasks}
            </div>
          </MetricCard>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <MetricCard>
            <Statistic
              title={
                <Space>
                  <Database size={16} />
                  缓存命中率
                </Space>
              }
              value={systemStatus.cache_stats.hit_rate * 100}
              precision={1}
              suffix="%"
            />
            <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
              大小: {systemStatus.cache_stats.total_size} 项
            </div>
          </MetricCard>
        </Col>
      </Row>

      {/* 详细信息 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="性能趋势" size="small">
            <div
              style={{
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9f9f9',
                border: '1px dashed #d9d9d9',
                borderRadius: 4,
              }}
            >
              <div style={{ textAlign: 'center', color: '#999' }}>
                <TrendingUp size={32} style={{ marginBottom: 8 }} />
                <p>性能趋势图</p>
                <p style={{ fontSize: 12 }}>显示最近的CPU和内存使用情况</p>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="系统信息" size="small">
            <List
              size="small"
              dataSource={[
                {
                  title: '总内存',
                  value: formatBytes(systemStatus.memory_usage.total_allocated),
                  icon: <HardDrive size={14} />,
                },
                {
                  title: '堆内存',
                  value: formatBytes(systemStatus.memory_usage.heap_size),
                  icon: <Database size={14} />,
                },
                {
                  title: '缓存大小',
                  value: formatBytes(systemStatus.memory_usage.cache_size),
                  icon: <Activity size={14} />,
                },
                {
                  title: '平均响应时间',
                  value: `${systemStatus.performance_metrics.average_response_time.toFixed(1)}ms`,
                  icon: <Clock size={14} />,
                },
                {
                  title: '错误率',
                  value: `${(systemStatus.performance_metrics.error_rate * 100).toFixed(2)}%`,
                  icon: <TrendingUp size={14} />,
                },
              ]}
              renderItem={item => (
                <List.Item>
                  <Space>
                    {item.icon}
                    <span>{item.title}:</span>
                    <Tag>{item.value}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* 性能建议 */}
      {systemStatus.performance_metrics.cpu_usage > 80 ||
        (systemStatus.performance_metrics.memory_usage > 90 && (
          <Alert
            message="性能警告"
            description="系统资源使用率较高，建议执行性能优化或清空缓存。"
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
            action={
              <Space>
                <Button size="small" onClick={optimizePerformance}>
                  立即优化
                </Button>
                <Button size="small" onClick={clearCache}>
                  清空缓存
                </Button>
              </Space>
            }
          />
        ))}
    </MonitorContainer>
  );
};

export default PerformanceMonitor;
