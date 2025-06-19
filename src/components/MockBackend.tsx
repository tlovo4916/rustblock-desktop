// Mock backend for development when Tauri is not available
export const mockInvoke = async (command: string, args?: any): Promise<any> => {
  console.log(`Mock invoke: ${command}`, args);

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  switch (command) {
    case 'scan_devices':
      return [
        {
          id: 'arduino_1',
          name: 'Arduino Uno on COM3',
          device_type: 'Arduino',
          port: 'COM3',
          connected: false,
          vendor_id: 0x2341,
          product_id: 0x0043,
        },
        {
          id: 'microbit_1',
          name: 'micro:bit on COM4',
          device_type: 'MicroBit',
          port: 'COM4',
          connected: false,
          vendor_id: 0x0d28,
          product_id: 0x0204,
        },
      ];

    case 'upload_code':
      return '代码上传成功！';

    case 'get_system_status':
      return {
        performance_metrics: {
          cpu_usage: 15.5 + Math.random() * 10,
          memory_usage: 25.0 + Math.random() * 15,
          active_tasks: Math.floor(Math.random() * 5),
          cache_hit_rate: 0.85 + Math.random() * 0.1,
          average_response_time: 120.5 + Math.random() * 50,
          error_rate: Math.random() * 0.05,
          timestamp: Date.now(),
        },
        cache_stats: {
          total_size: 150 + Math.floor(Math.random() * 50),
          hit_rate: 0.85 + Math.random() * 0.1,
          miss_rate: 0.15 - Math.random() * 0.1,
          evictions: Math.floor(Math.random() * 10),
        },
        task_stats: {
          active_tasks: Math.floor(Math.random() * 5),
          completed_tasks: 158 + Math.floor(Math.random() * 20),
          failed_tasks: Math.floor(Math.random() * 5),
          average_execution_time: 89.2 + Math.random() * 20,
        },
        memory_usage: {
          total_allocated: 268435456,
          heap_size: 134217728,
          stack_size: 8388608,
          cache_size: 16777216,
        },
      };

    case 'optimize_performance':
      return {
        garbage_collection: '已执行',
        memory_compaction: '已优化',
        temp_cleanup: '已清理',
        counters_reset: '已重置',
      };

    case 'clear_cache':
      return null;

    case 'run_performance_benchmark':
      return {
        cpu_performance: 120 + Math.random() * 50,
        memory_performance: 85 + Math.random() * 30,
        io_performance: 95 + Math.random() * 40,
        cache_performance: 45 + Math.random() * 20,
      };

    case 'preload_resources':
      return {
        blockly: true,
        device_drivers: true,
        ai_models: Math.random() > 0.2,
      };

    case 'chat_with_ai':
      return {
        message: '你好！我是RustBlock的AI助手，很高兴为你服务！有什么编程问题我可以帮助你吗？',
        usage: {
          prompt_tokens: 20,
          completion_tokens: 30,
          total_tokens: 50,
        },
      };

    case 'configure_ai_service':
      return null;

    case 'get_device_status':
      const deviceId = args?.device_id || args?.deviceId;
      return {
        device_info: {
          id: deviceId,
          name: 'Arduino Uno on COM3',
          device_type: 'Arduino',
          port: 'COM3',
          connected: true,
        },
        driver_status: {
          installed: true,
          driver_info: {
            name: 'Arduino USB Driver',
            version: '1.0.0',
          },
        },
        ready: true,
        recommended_language: 'arduino',
        supported_languages: ['arduino'],
      };

    case 'check_upload_tools':
      return {
        'arduino-cli': Math.random() > 0.3,
        platformio: Math.random() > 0.5,
        mpremote: Math.random() > 0.4,
        ampy: Math.random() > 0.6,
        rshell: Math.random() > 0.7,
      };

    case 'install_missing_tools':
      return ['arduino-cli', 'mpremote'];

    case 'list_device_profiles':
      return [
        {
          id: 'profile_1',
          name: '我的Arduino配置',
          device_type: 'Arduino',
          preferred_language: 'arduino',
          baud_rate: 9600,
          auto_reconnect: true,
          reconnect_interval_ms: 5000,
          custom_settings: {},
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          is_favorite: true,
        },
        {
          id: 'profile_2',
          name: 'ESP32开发配置',
          device_type: 'ESP32',
          preferred_language: 'arduino',
          baud_rate: 115200,
          auto_reconnect: true,
          reconnect_interval_ms: 3000,
          custom_settings: {},
          created_at: new Date().toISOString(),
          last_modified: new Date().toISOString(),
          is_favorite: false,
        },
      ];

    case 'create_device_profile':
    case 'update_device_profile':
    case 'delete_device_profile':
      return null;

    case 'export_device_profiles':
      return JSON.stringify({
        profiles: [
          {
            id: 'profile_1',
            name: '导出的配置',
            device_type: 'Arduino',
            preferred_language: 'arduino',
            baud_rate: 9600,
          },
        ],
      });

    case 'import_device_profiles':
      return 2; // 返回导入的配置数量

    case 'record_connection_history':
      return null;

    case 'read_serial_data':
      // 模拟串口数据
      if (Math.random() > 0.7) {
        const messages = [
          'Hello World!',
          'Temperature: 25.6°C',
          'Sensor value: 512',
          'LED ON',
          'LED OFF',
          'Loop count: ' + Math.floor(Math.random() * 1000),
        ];
        return messages[Math.floor(Math.random() * messages.length)];
      }
      return ''; // 大部分时候返回空，模拟无数据

    case 'send_serial_data':
      return args?.data?.length || 0; // 返回发送的字节数

    default:
      console.warn(`未知的命令: ${command}`);
      return null;
  }
};

// 检测是否在 Tauri 环境中
export const isTauriAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof (window as any).__TAURI__ !== 'undefined';
};

// 包装 invoke 函数
export const safeInvoke = async (command: string, args?: any): Promise<any> => {
  if (isTauriAvailable()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke(command, args);
    } catch (error) {
      console.warn(`Tauri invoke 失败，使用模拟数据: ${command}`, error);
      return await mockInvoke(command, args);
    }
  } else {
    console.log('使用模拟后端:', command);
    return await mockInvoke(command, args);
  }
};
