import React from 'react';

const EditorPage: React.FC = () => {
  return (
    <div style={{ padding: 24 }}>
      <h1>可视化编程环境</h1>
      <div style={{ 
        background: 'white', 
        padding: 24, 
        borderRadius: 8, 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minHeight: 500
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* 积木工具箱 */}
          <div style={{ 
            width: 200, 
            background: '#f5f5f5', 
            padding: 16, 
            borderRadius: 8 
          }}>
            <h3>积木工具箱</h3>
            <div style={{ marginBottom: 16 }}>
              <h4>🔧 基础</h4>
              <div style={{ padding: 8, background: '#1890ff', color: 'white', borderRadius: 4, marginBottom: 8, cursor: 'pointer' }}>
                开始
              </div>
              <div style={{ padding: 8, background: '#52c41a', color: 'white', borderRadius: 4, marginBottom: 8, cursor: 'pointer' }}>
                重复执行
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <h4>💡 输出</h4>
              <div style={{ padding: 8, background: '#faad14', color: 'white', borderRadius: 4, marginBottom: 8, cursor: 'pointer' }}>
                点亮LED
              </div>
              <div style={{ padding: 8, background: '#eb2f96', color: 'white', borderRadius: 4, marginBottom: 8, cursor: 'pointer' }}>
                显示文字
              </div>
            </div>
          </div>
          
          {/* 编程工作区 */}
          <div style={{ flex: 1, border: '2px dashed #d9d9d9', borderRadius: 8, padding: 24, textAlign: 'center' }}>
            <h3>拖拽积木到这里开始编程</h3>
            <p style={{ color: '#8c8c8c' }}>从左侧工具箱拖拽积木块到这里，组成你的程序</p>
            <div style={{ marginTop: 32, padding: 16, background: '#f0f0f0', borderRadius: 8 }}>
              <p>🚧 积木编辑器正在开发中...</p>
              <p>将集成 Blockly 可视化编程工具</p>
            </div>
          </div>
          
          {/* 代码预览 */}
          <div style={{ 
            width: 300, 
            background: '#f5f5f5', 
            padding: 16, 
            borderRadius: 8 
          }}>
            <h3>生成的代码</h3>
            <div style={{ 
              background: '#001529', 
              color: '#52c41a', 
              padding: 16, 
              borderRadius: 4, 
              fontFamily: 'monospace',
              fontSize: 12,
              minHeight: 200
            }}>
              {`// Arduino 代码预览
void setup() {
  Serial.begin(9600);
  pinMode(LED_BUILTIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_BUILTIN, HIGH);
  delay(1000);
  digitalWrite(LED_BUILTIN, LOW);
  delay(1000);
}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditorPage; 