use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tokio::sync::Mutex;
use serde::{Serialize, Deserialize};
use anyhow::Result;
use log::{debug, info, warn};

/// 缓存项结构
#[derive(Debug, Clone)]
pub struct CacheItem<T> {
    pub data: T,
    pub created_at: Instant,
    pub last_accessed: Instant,
    pub access_count: u64,
}

impl<T> CacheItem<T> {
    pub fn new(data: T) -> Self {
        let now = Instant::now();
        Self {
            data,
            created_at: now,
            last_accessed: now,
            access_count: 1,
        }
    }

    pub fn access(&mut self) -> &T {
        self.last_accessed = Instant::now();
        self.access_count += 1;
        &self.data
    }

    pub fn is_expired(&self, ttl: Duration) -> bool {
        self.created_at.elapsed() > ttl
    }

    pub fn should_evict(&self, idle_timeout: Duration) -> bool {
        self.last_accessed.elapsed() > idle_timeout
    }
}

/// 高性能LRU缓存
pub struct LRUCache<K, V> 
where
    K: Clone + Eq + std::hash::Hash,
    V: Clone,
{
    cache: Arc<RwLock<HashMap<K, CacheItem<V>>>>,
    max_size: usize,
    ttl: Duration,
    idle_timeout: Duration,
}

impl<K, V> LRUCache<K, V>
where
    K: Clone + Eq + std::hash::Hash,
    V: Clone,
{
    pub fn new(max_size: usize, ttl: Duration, idle_timeout: Duration) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            max_size,
            ttl,
            idle_timeout,
        }
    }

    pub fn get(&self, key: &K) -> Option<V> {
        let mut cache = self.cache.write().unwrap();
        
        if let Some(item) = cache.get_mut(key) {
            if item.is_expired(self.ttl) {
                cache.remove(key);
                debug!("缓存项过期，已移除");
                return None;
            }
            
            Some(item.access().clone())
        } else {
            None
        }
    }

    pub fn put(&self, key: K, value: V) {
        let mut cache = self.cache.write().unwrap();
        
        // 如果超过最大容量，移除最少使用的项
        if cache.len() >= self.max_size {
            self.evict_lru(&mut cache);
        }
        
        cache.insert(key, CacheItem::new(value));
    }

    pub fn remove(&self, key: &K) {
        let mut cache = self.cache.write().unwrap();
        cache.remove(key);
    }

    pub fn clear(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.clear();
        info!("缓存已清空");
    }

    pub fn size(&self) -> usize {
        let cache = self.cache.read().unwrap();
        cache.len()
    }

    pub fn cleanup_expired(&self) {
        let mut cache = self.cache.write().unwrap();
        let before_size = cache.len();
        
        cache.retain(|_, item| {
            !item.is_expired(self.ttl) && !item.should_evict(self.idle_timeout)
        });
        
        let removed = before_size - cache.len();
        if removed > 0 {
            info!("清理了 {} 个过期缓存项", removed);
        }
    }

    fn evict_lru(&self, cache: &mut HashMap<K, CacheItem<V>>) {
        if let Some((key_to_remove, _)) = cache
            .iter()
            .min_by_key(|(_, item)| (item.last_accessed, item.access_count))
            .map(|(k, v)| (k.clone(), v.clone()))
        {
            cache.remove(&key_to_remove);
            debug!("LRU驱逐缓存项");
        }
    }
}

/// 并发任务管理器
pub struct TaskManager {
    max_concurrent_tasks: usize,
    active_tasks: Arc<Mutex<usize>>,
}

impl TaskManager {
    pub fn new(max_concurrent_tasks: usize) -> Self {
        Self {
            max_concurrent_tasks,
            active_tasks: Arc::new(Mutex::new(0)),
        }
    }

    pub async fn active_task_count(&self) -> usize {
        let count = self.active_tasks.lock().await;
        *count
    }
}

/// 性能监控器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub active_tasks: usize,
    pub cache_hit_rate: f64,
    pub average_response_time: f64,
    pub error_rate: f64,
    pub timestamp: i64,
}

pub struct PerformanceMonitor {
    metrics_history: Arc<RwLock<Vec<PerformanceMetrics>>>,
    max_history_size: usize,
    start_time: Instant,
    request_count: Arc<RwLock<u64>>,
    error_count: Arc<RwLock<u64>>,
    total_response_time: Arc<RwLock<Duration>>,
}

impl PerformanceMonitor {
    pub fn new(max_history_size: usize) -> Self {
        Self {
            metrics_history: Arc::new(RwLock::new(Vec::new())),
            max_history_size,
            start_time: Instant::now(),
            request_count: Arc::new(RwLock::new(0)),
            error_count: Arc::new(RwLock::new(0)),
            total_response_time: Arc::new(RwLock::new(Duration::ZERO)),
        }
    }

    pub fn record_request(&self, response_time: Duration, is_error: bool) {
        {
            let mut count = self.request_count.write().unwrap();
            *count += 1;
        }
        
        {
            let mut total_time = self.total_response_time.write().unwrap();
            *total_time += response_time;
        }
        
        if is_error {
            let mut error_count = self.error_count.write().unwrap();
            *error_count += 1;
        }
    }

    pub fn collect_metrics(&self, active_tasks: usize, cache_hit_rate: f64) -> PerformanceMetrics {
        let request_count = *self.request_count.read().unwrap();
        let error_count = *self.error_count.read().unwrap();
        let total_response_time = *self.total_response_time.read().unwrap();
        
        let error_rate = if request_count > 0 {
            error_count as f64 / request_count as f64
        } else {
            0.0
        };
        
        let average_response_time = if request_count > 0 {
            total_response_time.as_millis() as f64 / request_count as f64
        } else {
            0.0
        };
        
        let metrics = PerformanceMetrics {
            cpu_usage: self.get_cpu_usage(),
            memory_usage: self.get_memory_usage(),
            active_tasks,
            cache_hit_rate,
            average_response_time,
            error_rate,
            timestamp: chrono::Utc::now().timestamp(),
        };
        
        // 添加到历史记录
        {
            let mut history = self.metrics_history.write().unwrap();
            history.push(metrics.clone());
            
            // 保持历史记录大小限制
            if history.len() > self.max_history_size {
                history.remove(0);
            }
        }
        
        metrics
    }

    pub fn get_metrics_history(&self) -> Vec<PerformanceMetrics> {
        let history = self.metrics_history.read().unwrap();
        history.clone()
    }

    pub fn reset_counters(&self) {
        {
            let mut count = self.request_count.write().unwrap();
            *count = 0;
        }
        
        {
            let mut count = self.error_count.write().unwrap();
            *count = 0;
        }
        
        {
            let mut time = self.total_response_time.write().unwrap();
            *time = Duration::ZERO;
        }
    }

    fn get_cpu_usage(&self) -> f64 {
        // 简化的CPU使用率获取
        15.5 // 模拟值
    }

    fn get_memory_usage(&self) -> f64 {
        // 简化的内存使用率获取
        25.0 // 模拟值
    }
}