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
                debug!("缓存项过期，已移除: {:?}", key);
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
    task_queue: Arc<Mutex<Vec<Box<dyn FnOnce() + Send + 'static>>>>,
}

impl TaskManager {
    pub fn new(max_concurrent_tasks: usize) -> Self {
        Self {
            max_concurrent_tasks,
            active_tasks: Arc::new(Mutex::new(0)),
            task_queue: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn execute<F, Fut, T>(&self, task: F) -> Result<T>
    where
        F: FnOnce() -> Fut + Send + 'static,
        Fut: std::future::Future<Output = Result<T>> + Send,
        T: Send + 'static,
    {
        // 检查当前活动任务数
        let mut active_count = self.active_tasks.lock().await;
        
        if *active_count >= self.max_concurrent_tasks {
            warn!("任务队列已满，等待执行");
            drop(active_count);
            
            // 等待有空闲位置
            loop {
                tokio::time::sleep(Duration::from_millis(10)).await;
                let count = self.active_tasks.lock().await;
                if *count < self.max_concurrent_tasks {
                    break;
                }
            }
            
            active_count = self.active_tasks.lock().await;
        }
        
        *active_count += 1;
        drop(active_count);
        
        let active_tasks = Arc::clone(&self.active_tasks);
        
        // 执行任务
        let result = tokio::spawn(async move {
            let result = task().await;
            
            // 任务完成，减少活动计数
            let mut count = active_tasks.lock().await;
            *count -= 1;
            
            result
        }).await;
        
        match result {
            Ok(task_result) => task_result,
            Err(e) => Err(anyhow::anyhow!("任务执行失败: {}", e)),
        }
    }

    pub async fn active_task_count(&self) -> usize {
        let count = self.active_tasks.lock().await;
        *count
    }
}

/// 资源池管理器
pub struct ResourcePool<T> {
    resources: Arc<Mutex<Vec<T>>>,
    max_size: usize,
    create_fn: Box<dyn Fn() -> Result<T> + Send + Sync>,
}

impl<T> ResourcePool<T>
where
    T: Send + 'static,
{
    pub fn new<F>(max_size: usize, create_fn: F) -> Self
    where
        F: Fn() -> Result<T> + Send + Sync + 'static,
    {
        Self {
            resources: Arc::new(Mutex::new(Vec::new())),
            max_size,
            create_fn: Box::new(create_fn),
        }
    }

    pub async fn acquire(&self) -> Result<PooledResource<T>> {
        let mut resources = self.resources.lock().await;
        
        if let Some(resource) = resources.pop() {
            return Ok(PooledResource::new(resource, Arc::clone(&self.resources)));
        }
        
        drop(resources);
        
        // 创建新资源
        let resource = (self.create_fn)()?;
        Ok(PooledResource::new(resource, Arc::clone(&self.resources)))
    }

    pub async fn size(&self) -> usize {
        let resources = self.resources.lock().await;
        resources.len()
    }
}

/// 池化资源包装器
pub struct PooledResource<T> {
    resource: Option<T>,
    pool: Arc<Mutex<Vec<T>>>,
}

impl<T> PooledResource<T> {
    fn new(resource: T, pool: Arc<Mutex<Vec<T>>>) -> Self {
        Self {
            resource: Some(resource),
            pool,
        }
    }

    pub fn get(&self) -> Option<&T> {
        self.resource.as_ref()
    }

    pub fn get_mut(&mut self) -> Option<&mut T> {
        self.resource.as_mut()
    }
}

impl<T> Drop for PooledResource<T> {
    fn drop(&mut self) {
        if let Some(resource) = self.resource.take() {
            tokio::spawn(async move {
                let mut pool = self.pool.lock().await;
                pool.push(resource);
            });
        }
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
        // 简化的CPU使用率获取，实际应用中可以使用系统调用
        // 这里返回模拟值
        use std::process;
        let pid = process::id();
        // 在实际应用中，可以使用sysinfo或类似库获取真实的CPU使用率
        rand::random::<f64>() * 20.0 + 5.0 // 模拟5-25%的CPU使用率
    }

    fn get_memory_usage(&self) -> f64 {
        // 简化的内存使用率获取
        // 在实际应用中，可以使用sysinfo获取真实的内存使用率
        rand::random::<f64>() * 30.0 + 10.0 // 模拟10-40%的内存使用率
    }
}

/// 延迟加载管理器
pub struct LazyLoader<K, V>
where
    K: Clone + Eq + std::hash::Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    cache: LRUCache<K, V>,
    loader_fn: Arc<dyn Fn(&K) -> Result<V> + Send + Sync>,
    loading_tasks: Arc<Mutex<HashMap<K, tokio::task::JoinHandle<Result<V>>>>>,
}

impl<K, V> LazyLoader<K, V>
where
    K: Clone + Eq + std::hash::Hash + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    pub fn new<F>(cache_size: usize, ttl: Duration, loader_fn: F) -> Self
    where
        F: Fn(&K) -> Result<V> + Send + Sync + 'static,
    {
        Self {
            cache: LRUCache::new(cache_size, ttl, Duration::from_secs(300)),
            loader_fn: Arc::new(loader_fn),
            loading_tasks: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn get(&self, key: &K) -> Result<V> {
        // 首先检查缓存
        if let Some(value) = self.cache.get(key) {
            debug!("缓存命中: {:?}", key);
            return Ok(value);
        }

        // 检查是否已经在加载中
        {
            let mut loading_tasks = self.loading_tasks.lock().await;
            if let Some(task) = loading_tasks.get(key) {
                if !task.is_finished() {
                    debug!("等待已在进行的加载任务: {:?}", key);
                    // 等待现有任务完成
                    drop(loading_tasks);
                    return self.wait_for_task(key).await;
                } else {
                    // 任务已完成，移除它
                    loading_tasks.remove(key);
                }
            }
        }

        // 开始新的加载任务
        self.start_loading_task(key.clone()).await
    }

    async fn start_loading_task(&self, key: K) -> Result<V> {
        let loader_fn = Arc::clone(&self.loader_fn);
        let cache = self.cache.clone();
        let loading_tasks = Arc::clone(&self.loading_tasks);
        let key_clone = key.clone();

        let task = tokio::spawn(async move {
            debug!("开始加载: {:?}", key_clone);
            let result = loader_fn(&key_clone);
            
            match &result {
                Ok(value) => {
                    // 加载成功，放入缓存
                    cache.put(key_clone.clone(), value.clone());
                    debug!("加载完成并已缓存: {:?}", key_clone);
                }
                Err(e) => {
                    warn!("加载失败: {:?}, 错误: {}", key_clone, e);
                }
            }
            
            // 从加载任务列表中移除
            let mut tasks = loading_tasks.lock().await;
            tasks.remove(&key_clone);
            
            result
        });

        // 将任务添加到加载列表
        {
            let mut loading_tasks = self.loading_tasks.lock().await;
            loading_tasks.insert(key.clone(), task);
        }

        self.wait_for_task(&key).await
    }

    async fn wait_for_task(&self, key: &K) -> Result<V> {
        let task = {
            let loading_tasks = self.loading_tasks.lock().await;
            loading_tasks.get(key).cloned()
        };

        if let Some(task) = task {
            match task.await {
                Ok(result) => result,
                Err(e) => Err(anyhow::anyhow!("加载任务失败: {}", e)),
            }
        } else {
            // 任务不存在，尝试从缓存获取
            self.cache.get(key)
                .ok_or_else(|| anyhow::anyhow!("无法获取数据"))
        }
    }

    pub fn invalidate(&self, key: &K) {
        self.cache.remove(key);
    }

    pub fn clear_cache(&self) {
        self.cache.clear();
    }
}

// 添加rand依赖的模拟实现（避免外部依赖）
mod rand {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    use std::time::{SystemTime, UNIX_EPOCH};

    pub fn random<T>() -> T 
    where 
        T: From<f64>
    {
        let mut hasher = DefaultHasher::new();
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            .hash(&mut hasher);
        
        let hash = hasher.finish();
        let normalized = (hash as f64) / (u64::MAX as f64);
        T::from(normalized)
    }
}