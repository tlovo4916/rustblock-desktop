import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Tabs } from 'antd';

interface DeviceConfigurationProps {
  deviceId: string | null;
  onConfigSaved?: () => void;
}

interface DeviceConfig {
  board_type: string;
  cpu_frequency?: number;
  flash_mode?: string;
  flash_size?: string;
  upload_speed: number;
  programmer?: string;
  extra_flags?: string[];
}

interface ConfigProfile {
  id: string;
  name: string;
  device_type: string;
  config: DeviceConfig;
  created_at: number;
  is_favorite?: boolean;
}

const DeviceConfiguration: React.FC<DeviceConfigurationProps> = ({ deviceId, onConfigSaved }) => {
  const [config, setConfig] = useState<DeviceConfig>({
    board_type: 'arduino:avr:uno',
    upload_speed: 115200,
  });
  const [profiles, setProfiles] = useState<ConfigProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 加载设备配置
  const loadDeviceConfig = async () => {
    if (!deviceId) return;

    try {
      const result = await invoke<DeviceConfig>('get_device_config', { deviceId });
      if (result) {
        setConfig(result);
      }
    } catch (error) {
      console.error('加载设备配置失败:', error);
    }
  };

  // 加载配置文件列表
  const loadProfiles = async () => {
    try {
      const result = await invoke<ConfigProfile[]>('list_config_profiles');
      setProfiles(result);
    } catch (error) {
      console.error('加载配置文件失败:', error);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!deviceId) return;

    setLoading(true);
    try {
      await invoke('save_device_config', { deviceId, config });
      alert('配置保存成功！');
      if (onConfigSaved) {
        onConfigSaved();
      }
    } catch (error) {
      console.error('保存配置失败:', error);
      alert(`保存配置失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 保存为配置文件
  const saveAsProfile = async () => {
    if (!profileName.trim()) {
      alert('请输入配置文件名称');
      return;
    }

    try {
      const profile: Omit<ConfigProfile, 'id' | 'created_at'> = {
        name: profileName,
        device_type: config.board_type.split(':')[2] || 'unknown',
        config: { ...config },
      };

      await invoke('save_config_profile', { profile });
      alert('配置文件保存成功！');
      setProfileName('');
      await loadProfiles();
    } catch (error) {
      console.error('保存配置文件失败:', error);
      alert(`保存配置文件失败: ${error}`);
    }
  };

  // 加载配置文件
  const loadProfile = async (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setConfig(profile.config);
      setSelectedProfile(profileId);
    }
  };

  // 删除配置文件
  const deleteProfile = async (profileId: string) => {
    if (!confirm('确定要删除此配置文件吗？')) return;

    try {
      await invoke('delete_config_profile', { profileId });
      await loadProfiles();
      if (selectedProfile === profileId) {
        setSelectedProfile(null);
      }
    } catch (error) {
      console.error('删除配置文件失败:', error);
      alert(`删除配置文件失败: ${error}`);
    }
  };

  // 导出配置
  const exportConfig = () => {
    const data = JSON.stringify(config, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `device_config_${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 导入配置
  const importConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const importedConfig = JSON.parse(e.target?.result as string);
        setConfig(importedConfig);
        alert('配置导入成功！');
      } catch (error) {
        alert('配置文件格式错误');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    loadDeviceConfig();
    loadProfiles();
  }, [deviceId]);

  // 板卡类型选项
  const boardTypes = [
    { value: 'arduino:avr:uno', label: 'Arduino Uno' },
    { value: 'arduino:avr:nano', label: 'Arduino Nano' },
    { value: 'arduino:avr:mega', label: 'Arduino Mega 2560' },
    { value: 'arduino:avr:leonardo', label: 'Arduino Leonardo' },
    { value: 'esp32:esp32:esp32', label: 'ESP32 Dev Module' },
    { value: 'esp32:esp32:esp32s2', label: 'ESP32-S2' },
    { value: 'esp32:esp32:esp32c3', label: 'ESP32-C3' },
    { value: 'rp2040:rp2040:rpipico', label: 'Raspberry Pi Pico' },
    { value: 'microbit:microbit:microbit', label: 'BBC micro:bit' },
  ];

  // 上传速度选项
  const uploadSpeeds = [9600, 19200, 38400, 57600, 74880, 115200, 230400, 460800, 921600];

  // CPU 频率选项（ESP32）
  const cpuFrequencies = [80, 160, 240];

  // Flash 模式选项（ESP32）
  const flashModes = ['qio', 'qout', 'dio', 'dout'];

  // Flash 大小选项（ESP32）
  const flashSizes = ['4MB', '8MB', '16MB'];

  return (
    <div style={{ padding: 24 }}>
      <h2>设备配置 {deviceId ? `- ${deviceId}` : ''}</h2>

      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <Tabs.TabPane tab="基本配置" key="basic">
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>板卡类型</label>
              <select
                value={config.board_type}
                onChange={e => setConfig({ ...config, board_type: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                }}
              >
                {boardTypes.map(board => (
                  <option key={board.value} value={board.value}>
                    {board.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>上传速度</label>
              <select
                value={config.upload_speed}
                onChange={e => setConfig({ ...config, upload_speed: parseInt(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                }}
              >
                {uploadSpeeds.map(speed => (
                  <option key={speed} value={speed}>
                    {speed} baud
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>编程器（可选）</label>
              <input
                type="text"
                value={config.programmer || ''}
                onChange={e => setConfig({ ...config, programmer: e.target.value })}
                placeholder="例如: avrisp, usbasp"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                }}
              />
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="高级配置" key="advanced">
          <div style={{ marginBottom: 24 }}>
            {config.board_type.includes('esp32') && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>CPU 频率</label>
                  <select
                    value={config.cpu_frequency || 160}
                    onChange={e =>
                      setConfig({ ...config, cpu_frequency: parseInt(e.target.value) })
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                    }}
                  >
                    {cpuFrequencies.map(freq => (
                      <option key={freq} value={freq}>
                        {freq} MHz
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Flash 模式</label>
                  <select
                    value={config.flash_mode || 'dio'}
                    onChange={e => setConfig({ ...config, flash_mode: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                    }}
                  >
                    {flashModes.map(mode => (
                      <option key={mode} value={mode}>
                        {mode.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Flash 大小</label>
                  <select
                    value={config.flash_size || '4MB'}
                    onChange={e => setConfig({ ...config, flash_size: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 4,
                    }}
                  >
                    {flashSizes.map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>额外编译标志</label>
              <textarea
                value={config.extra_flags?.join('\n') || ''}
                onChange={e =>
                  setConfig({
                    ...config,
                    extra_flags: e.target.value.split('\n').filter(f => f.trim()),
                  })
                }
                placeholder="每行一个标志"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  minHeight: 100,
                }}
              />
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane tab="配置文件" key="profiles">
          <div style={{ marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <h4>保存当前配置为文件</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="配置文件名称"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 4,
                  }}
                />
                <button
                  onClick={saveAsProfile}
                  style={{
                    padding: '8px 16px',
                    background: '#52c41a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  保存
                </button>
              </div>
            </div>

            <div>
              <h4>已保存的配置文件</h4>
              {profiles.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: 24 }}>暂无配置文件</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {profiles.map(profile => (
                    <div
                      key={profile.id}
                      style={{
                        border:
                          selectedProfile === profile.id
                            ? '2px solid #1890ff'
                            : '1px solid #d9d9d9',
                        borderRadius: 8,
                        padding: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: selectedProfile === profile.id ? '#e6f7ff' : 'white',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{profile.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          {profile.device_type} •{' '}
                          {new Date(profile.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => loadProfile(profile.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#1890ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          加载
                        </button>
                        <button
                          onClick={() => deleteProfile(profile.id)}
                          style={{
                            padding: '4px 8px',
                            background: '#ff4d4f',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Tabs.TabPane>
      </Tabs>

      <div
        style={{
          marginTop: 24,
          paddingTop: 24,
          borderTop: '1px solid #d9d9d9',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={exportConfig}
            style={{
              padding: '8px 16px',
              background: '#faad14',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            导出配置
          </button>
          <label
            style={{
              padding: '8px 16px',
              background: '#722ed1',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            导入配置
            <input type="file" accept=".json" onChange={importConfig} style={{ display: 'none' }} />
          </label>
        </div>

        <button
          onClick={saveConfig}
          disabled={loading || !deviceId}
          style={{
            padding: '8px 24px',
            background: loading || !deviceId ? '#d9d9d9' : '#1890ff',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading || !deviceId ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>
    </div>
  );
};

export default DeviceConfiguration;
