import * as Blockly from 'blockly';
import { arduino } from 'blockly/javascript';

// Arduino代码生成器配置
export function initArduinoGenerator() {
  // 机器人移动
  arduino['robot_move_forward'] = function(block: any) {
    const steps = block.getFieldValue('STEPS');
    return `moveForward(${steps});\n`;
  };

  // 机器人转向
  arduino['robot_turn'] = function(block: any) {
    const direction = block.getFieldValue('DIRECTION');
    const degrees = block.getFieldValue('DEGREES');
    return `turn${direction === 'LEFT' ? 'Left' : 'Right'}(${degrees});\n`;
  };

  // 机器人停止
  arduino['robot_stop'] = function(block: any) {
    return 'stop();\n';
  };

  // 设置速度
  arduino['robot_set_speed'] = function(block: any) {
    const speed = block.getFieldValue('SPEED');
    const speedValue = speed === 'SLOW' ? 50 : speed === 'MEDIUM' ? 100 : 150;
    return `setSpeed(${speedValue});\n`;
  };

  // LED开启
  arduino['led_on'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return `digitalWrite(${pin}, HIGH);\n`;
  };

  // LED关闭
  arduino['led_off'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return `digitalWrite(${pin}, LOW);\n`;
  };

  // LED闪烁
  arduino['led_blink'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    const times = block.getFieldValue('TIMES');
    let code = `for(int i = 0; i < ${times}; i++) {\n`;
    code += `  digitalWrite(${pin}, HIGH);\n`;
    code += `  delay(500);\n`;
    code += `  digitalWrite(${pin}, LOW);\n`;
    code += `  delay(500);\n`;
    code += `}\n`;
    return code;
  };

  // RGB LED颜色
  arduino['rgb_led_color'] = function(block: any) {
    const red = block.getFieldValue('RED');
    const green = block.getFieldValue('GREEN');
    const blue = block.getFieldValue('BLUE');
    return `setRGBColor(${red}, ${green}, ${blue});\n`;
  };

  // 距离传感器
  arduino['sensor_distance'] = function(block: any) {
    return ['getDistance()', arduino.ORDER_ATOMIC];
  };

  // 光线传感器
  arduino['sensor_light'] = function(block: any) {
    return ['analogRead(A0)', arduino.ORDER_ATOMIC];
  };

  // 温度传感器
  arduino['sensor_temperature'] = function(block: any) {
    return ['getTemperature()', arduino.ORDER_ATOMIC];
  };

  // 按钮传感器
  arduino['sensor_button'] = function(block: any) {
    const button = block.getFieldValue('BUTTON');
    if (button === 'AB') {
      return ['(digitalRead(BUTTON_A) == LOW && digitalRead(BUTTON_B) == LOW)', arduino.ORDER_ATOMIC];
    }
    return [`digitalRead(BUTTON_${button}) == LOW`, arduino.ORDER_ATOMIC];
  };

  // 触摸传感器
  arduino['sensor_touch'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return [`touchRead(${pin}) < 40`, arduino.ORDER_ATOMIC];
  };

  // 播放音调
  arduino['sound_play_tone'] = function(block: any) {
    const tone = block.getFieldValue('TONE');
    const duration = block.getFieldValue('DURATION');
    return `tone(BUZZER_PIN, ${tone}, ${duration});\ndelay(${duration});\n`;
  };

  // 播放旋律
  arduino['sound_play_melody'] = function(block: any) {
    const melody = block.getFieldValue('MELODY');
    return `playMelody(${melody});\n`;
  };

  // 显示文字
  arduino['display_show_text'] = function(block: any) {
    const text = block.getFieldValue('TEXT');
    return `display.print("${text}");\n`;
  };

  // 显示数字
  arduino['display_show_number'] = function(block: any) {
    const number = arduino.valueToCode(block, 'NUMBER', arduino.ORDER_ATOMIC) || '0';
    return `display.print(${number});\n`;
  };

  // 清空显示
  arduino['display_clear'] = function(block: any) {
    return 'display.clear();\n';
  };

  // 显示图案
  arduino['display_show_image'] = function(block: any) {
    const image = block.getFieldValue('IMAGE');
    return `showImage(${image});\n`;
  };

  // 事件：程序启动
  arduino['event_when_started'] = function(block: any) {
    const code = arduino.statementToCode(block, 'DO');
    return code;
  };

  // 事件：按钮按下
  arduino['event_when_button_pressed'] = function(block: any) {
    const button = block.getFieldValue('BUTTON');
    const code = arduino.statementToCode(block, 'DO');
    let condition = '';
    
    if (button === 'AB') {
      condition = 'digitalRead(BUTTON_A) == LOW && digitalRead(BUTTON_B) == LOW';
    } else {
      condition = `digitalRead(BUTTON_${button}) == LOW`;
    }
    
    return `if (${condition}) {\n${code}}\n`;
  };

  // 事件：传感器值条件
  arduino['event_when_sensor_value'] = function(block: any) {
    const sensor = block.getFieldValue('SENSOR');
    const operator = block.getFieldValue('OPERATOR');
    const value = block.getFieldValue('VALUE');
    const code = arduino.statementToCode(block, 'DO');
    
    let sensorCode = '';
    switch(sensor) {
      case 'DISTANCE':
        sensorCode = 'getDistance()';
        break;
      case 'LIGHT':
        sensorCode = 'analogRead(A0)';
        break;
      case 'TEMPERATURE':
        sensorCode = 'getTemperature()';
        break;
    }
    
    const op = operator === 'GT' ? '>' : operator === 'LT' ? '<' : '==';
    
    return `if (${sensorCode} ${op} ${value}) {\n${code}}\n`;
  };
}

// 生成完整的Arduino代码
export function generateArduinoCode(workspace: Blockly.WorkspaceSvg): string {
  // 初始化生成器
  initArduinoGenerator();
  
  // 生成主代码
  const code = arduino.workspaceToCode(workspace);
  
  // 生成完整的Arduino程序
  let fullCode = `// RustBlock自动生成的Arduino代码
// 生成时间: ${new Date().toLocaleString()}

// 引脚定义
#define LED_PIN 13
#define BUTTON_A 2
#define BUTTON_B 3
#define BUZZER_PIN 9
#define MOTOR_L 5
#define MOTOR_R 6
#define TRIG_PIN 7
#define ECHO_PIN 8

// 全局变量
int motorSpeed = 100;

void setup() {
  Serial.begin(9600);
  
  // 初始化引脚
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_A, INPUT_PULLUP);
  pinMode(BUTTON_B, INPUT_PULLUP);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(MOTOR_L, OUTPUT);
  pinMode(MOTOR_R, OUTPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  
  Serial.println("RustBlock程序开始运行!");
}

// 辅助函数
void moveForward(int steps) {
  for(int i = 0; i < steps; i++) {
    analogWrite(MOTOR_L, motorSpeed);
    analogWrite(MOTOR_R, motorSpeed);
    delay(100);
  }
  stop();
}

void turnLeft(int degrees) {
  int turnTime = degrees * 10; // 简化的转向时间计算
  analogWrite(MOTOR_L, 0);
  analogWrite(MOTOR_R, motorSpeed);
  delay(turnTime);
  stop();
}

void turnRight(int degrees) {
  int turnTime = degrees * 10;
  analogWrite(MOTOR_L, motorSpeed);
  analogWrite(MOTOR_R, 0);
  delay(turnTime);
  stop();
}

void stop() {
  analogWrite(MOTOR_L, 0);
  analogWrite(MOTOR_R, 0);
}

void setSpeed(int speed) {
  motorSpeed = speed;
}

void setRGBColor(int r, int g, int b) {
  // RGB LED控制代码
  // 需要根据具体硬件调整
}

float getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  float distance = duration * 0.034 / 2;
  
  return distance;
}

float getTemperature() {
  // 温度传感器读取代码
  // 需要根据具体传感器型号实现
  return 25.0; // 临时返回值
}

void playMelody(String melody) {
  // 播放旋律的代码
  if (melody == "BIRTHDAY") {
    // 生日快乐旋律
    tone(BUZZER_PIN, 262, 200);
    delay(250);
    tone(BUZZER_PIN, 262, 200);
    delay(250);
    tone(BUZZER_PIN, 294, 400);
    delay(450);
  }
  // 其他旋律...
}

void showImage(String image) {
  // 显示图案的代码
  // 需要根据具体显示设备实现
}

void loop() {
${code}
}
`;

  return fullCode;
}