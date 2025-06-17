import * as Blockly from 'blockly';
import { python } from 'blockly/python';

// MicroPython代码生成器配置
export function initMicroPythonGenerator() {
  // 机器人移动
  python['robot_move_forward'] = function(block: any) {
    const steps = block.getFieldValue('STEPS');
    return `move_forward(${steps})\n`;
  };

  // 机器人转向
  python['robot_turn'] = function(block: any) {
    const direction = block.getFieldValue('DIRECTION');
    const degrees = block.getFieldValue('DEGREES');
    const func = direction === 'LEFT' ? 'turn_left' : 'turn_right';
    return `${func}(${degrees})\n`;
  };

  // 机器人停止
  python['robot_stop'] = function(block: any) {
    return 'stop()\n';
  };

  // 设置速度
  python['robot_set_speed'] = function(block: any) {
    const speed = block.getFieldValue('SPEED');
    const speedValue = speed === 'SLOW' ? 50 : speed === 'MEDIUM' ? 100 : 150;
    return `set_speed(${speedValue})\n`;
  };

  // LED开启
  python['led_on'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return `led${pin}.on()\n`;
  };

  // LED关闭
  python['led_off'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return `led${pin}.off()\n`;
  };

  // LED闪烁
  python['led_blink'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    const times = block.getFieldValue('TIMES');
    let code = `for i in range(${times}):\n`;
    code += `    led${pin}.on()\n`;
    code += `    sleep(500)\n`;
    code += `    led${pin}.off()\n`;
    code += `    sleep(500)\n`;
    return code;
  };

  // RGB LED颜色
  python['rgb_led_color'] = function(block: any) {
    const red = block.getFieldValue('RED');
    const green = block.getFieldValue('GREEN');
    const blue = block.getFieldValue('BLUE');
    return `set_rgb_color(${red}, ${green}, ${blue})\n`;
  };

  // 距离传感器
  python['sensor_distance'] = function(block: any) {
    return ['get_distance()', python.ORDER_ATOMIC];
  };

  // 光线传感器
  python['sensor_light'] = function(block: any) {
    return ['light_sensor.read()', python.ORDER_ATOMIC];
  };

  // 温度传感器
  python['sensor_temperature'] = function(block: any) {
    return ['get_temperature()', python.ORDER_ATOMIC];
  };

  // 按钮传感器
  python['sensor_button'] = function(block: any) {
    const button = block.getFieldValue('BUTTON');
    if (button === 'AB') {
      return ['button_a.is_pressed() and button_b.is_pressed()', python.ORDER_ATOMIC];
    }
    return [`button_${button.toLowerCase()}.is_pressed()`, python.ORDER_ATOMIC];
  };

  // 触摸传感器
  python['sensor_touch'] = function(block: any) {
    const pin = block.getFieldValue('PIN');
    return [`pin${pin.substring(1)}.is_touched()`, python.ORDER_ATOMIC];
  };

  // 播放音调
  python['sound_play_tone'] = function(block: any) {
    const tone = block.getFieldValue('TONE');
    const duration = block.getFieldValue('DURATION');
    return `music.pitch(${tone}, ${duration})\n`;
  };

  // 播放旋律
  python['sound_play_melody'] = function(block: any) {
    const melody = block.getFieldValue('MELODY');
    return `play_melody("${melody}")\n`;
  };

  // 显示文字
  python['display_show_text'] = function(block: any) {
    const text = block.getFieldValue('TEXT');
    return `display.scroll("${text}")\n`;
  };

  // 显示数字
  python['display_show_number'] = function(block: any) {
    const number = python.valueToCode(block, 'NUMBER', python.ORDER_ATOMIC) || '0';
    return `display.scroll(str(${number}))\n`;
  };

  // 清空显示
  python['display_clear'] = function(block: any) {
    return 'display.clear()\n';
  };

  // 显示图案
  python['display_show_image'] = function(block: any) {
    const image = block.getFieldValue('IMAGE');
    return `display.show(Image.${image})\n`;
  };

  // 事件：程序启动
  python['event_when_started'] = function(block: any) {
    const code = python.statementToCode(block, 'DO');
    return code;
  };

  // 事件：按钮按下
  python['event_when_button_pressed'] = function(block: any) {
    const button = block.getFieldValue('BUTTON');
    const code = python.statementToCode(block, 'DO');
    let condition = '';
    
    if (button === 'AB') {
      condition = 'button_a.is_pressed() and button_b.is_pressed()';
    } else {
      condition = `button_${button.toLowerCase()}.is_pressed()`;
    }
    
    return `if ${condition}:\n${python.prefixLines(code, '    ')}\n`;
  };

  // 事件：传感器值条件
  python['event_when_sensor_value'] = function(block: any) {
    const sensor = block.getFieldValue('SENSOR');
    const operator = block.getFieldValue('OPERATOR');
    const value = block.getFieldValue('VALUE');
    const code = python.statementToCode(block, 'DO');
    
    let sensorCode = '';
    switch(sensor) {
      case 'DISTANCE':
        sensorCode = 'get_distance()';
        break;
      case 'LIGHT':
        sensorCode = 'light_sensor.read()';
        break;
      case 'TEMPERATURE':
        sensorCode = 'get_temperature()';
        break;
    }
    
    const op = operator === 'GT' ? '>' : operator === 'LT' ? '<' : '==';
    
    return `if ${sensorCode} ${op} ${value}:\n${python.prefixLines(code, '    ')}\n`;
  };
}

// 生成完整的MicroPython代码
export function generateMicroPythonCode(workspace: Blockly.WorkspaceSvg, deviceType: string): string {
  // 初始化生成器
  initMicroPythonGenerator();
  
  // 生成主代码
  const code = python.workspaceToCode(workspace);
  
  // 根据设备类型生成不同的导入和初始化代码
  let imports = '';
  let setup = '';
  
  if (deviceType === 'microbit') {
    imports = `# RustBlock自动生成的micro:bit MicroPython代码
# 生成时间: ${new Date().toLocaleString()}

from microbit import *
import music
import radio

# 初始化
radio.on()
`;
    
    setup = `
# 辅助函数
def move_forward(steps):
    """向前移动指定步数"""
    for _ in range(steps):
        pin0.write_digital(1)
        pin1.write_digital(1)
        sleep(100)
    stop()

def turn_left(degrees):
    """向左转指定角度"""
    turn_time = degrees * 10
    pin0.write_digital(0)
    pin1.write_digital(1)
    sleep(turn_time)
    stop()

def turn_right(degrees):
    """向右转指定角度"""
    turn_time = degrees * 10
    pin0.write_digital(1)
    pin1.write_digital(0)
    sleep(turn_time)
    stop()

def stop():
    """停止移动"""
    pin0.write_digital(0)
    pin1.write_digital(0)

def set_speed(speed):
    """设置移动速度"""
    # 在micro:bit上可能需要使用PWM
    pass

def get_distance():
    """获取超声波距离"""
    # 需要根据具体的超声波传感器实现
    return 10

def get_temperature():
    """获取温度"""
    return temperature()

def play_melody(melody_name):
    """播放预设旋律"""
    if melody_name == "BIRTHDAY":
        music.play(music.BIRTHDAY)
    elif melody_name == "TWINKLE":
        music.play(["C4:4", "C4:4", "G4:4", "G4:4", "A4:4", "A4:4", "G4:8"])
    elif melody_name == "ODE_TO_JOY":
        music.play(music.ODE_TO_JOY)

def set_rgb_color(r, g, b):
    """设置RGB LED颜色"""
    # 需要根据具体的RGB LED连接方式实现
    pass

# 创建LED对象
led13 = pin13
led12 = pin12
led11 = pin11
led10 = pin10

# 光线传感器
class LightSensor:
    def read(self):
        return pin2.read_analog()

light_sensor = LightSensor()
`;
  } else if (deviceType === 'esp32') {
    imports = `# RustBlock自动生成的ESP32 MicroPython代码
# 生成时间: ${new Date().toLocaleString()}

from machine import Pin, PWM, ADC
import time
import neopixel

# 初始化引脚
led13 = Pin(13, Pin.OUT)
led12 = Pin(12, Pin.OUT)
led11 = Pin(11, Pin.OUT)
led10 = Pin(10, Pin.OUT)

button_a = Pin(2, Pin.IN, Pin.PULL_UP)
button_b = Pin(4, Pin.IN, Pin.PULL_UP)

# PWM用于电机控制
motor_l = PWM(Pin(5))
motor_r = PWM(Pin(18))
motor_l.freq(1000)
motor_r.freq(1000)

# 超声波传感器
trig = Pin(19, Pin.OUT)
echo = Pin(21, Pin.IN)

# ADC用于光线传感器
light_sensor = ADC(Pin(34))
light_sensor.atten(ADC.ATTN_11DB)

motor_speed = 512  # PWM占空比 (0-1023)
`;
    
    setup = `
# 辅助函数
def sleep(ms):
    """睡眠指定毫秒"""
    time.sleep_ms(ms)

def move_forward(steps):
    """向前移动指定步数"""
    for _ in range(steps):
        motor_l.duty(motor_speed)
        motor_r.duty(motor_speed)
        sleep(100)
    stop()

def turn_left(degrees):
    """向左转指定角度"""
    turn_time = degrees * 10
    motor_l.duty(0)
    motor_r.duty(motor_speed)
    sleep(turn_time)
    stop()

def turn_right(degrees):
    """向右转指定角度"""
    turn_time = degrees * 10
    motor_l.duty(motor_speed)
    motor_r.duty(0)
    sleep(turn_time)
    stop()

def stop():
    """停止移动"""
    motor_l.duty(0)
    motor_r.duty(0)

def set_speed(speed):
    """设置移动速度"""
    global motor_speed
    motor_speed = int(speed * 1023 / 255)

def get_distance():
    """获取超声波距离（厘米）"""
    trig.off()
    time.sleep_us(2)
    trig.on()
    time.sleep_us(10)
    trig.off()
    
    while echo.value() == 0:
        pass
    t1 = time.ticks_us()
    
    while echo.value() == 1:
        pass
    t2 = time.ticks_us()
    
    distance = ((t2 - t1) * 0.034) / 2
    return distance

def get_temperature():
    """获取温度"""
    # 需要根据具体的温度传感器实现
    return 25.0

def play_melody(melody_name):
    """播放预设旋律"""
    # ESP32需要使用蜂鸣器或扬声器
    pass

def set_rgb_color(r, g, b):
    """设置RGB LED颜色"""
    # 使用NeoPixel或普通RGB LED
    pass

# 按钮状态检查
class Button:
    def __init__(self, pin):
        self.pin = pin
    
    def is_pressed(self):
        return self.pin.value() == 0

button_a = Button(button_a)
button_b = Button(button_b)

# 触摸引脚
class TouchPin:
    def __init__(self, pin_num):
        from machine import TouchPad
        self.touch = TouchPad(Pin(pin_num))
    
    def is_touched(self):
        return self.touch.read() < 500

pin0 = TouchPin(4)
pin1 = TouchPin(0)
pin2 = TouchPin(2)

# 显示屏（如果有OLED）
class Display:
    def __init__(self):
        # 初始化OLED显示屏
        pass
    
    def scroll(self, text):
        print(text)  # 暂时打印到控制台
    
    def clear(self):
        pass
    
    def show(self, image):
        pass

display = Display()

# 图像定义
class Image:
    HAPPY = "HAPPY"
    SAD = "SAD"
    HEART = "HEART"
    ARROW_UP = "ARROW_UP"
    CHECK = "CHECK"
`;
  } else {
    // Raspberry Pi Pico
    imports = `# RustBlock自动生成的Raspberry Pi Pico MicroPython代码
# 生成时间: ${new Date().toLocaleString()}

from machine import Pin, PWM, ADC
import time

# 初始化引脚
led13 = Pin(13, Pin.OUT)
led12 = Pin(12, Pin.OUT)
led11 = Pin(11, Pin.OUT)
led10 = Pin(10, Pin.OUT)

button_a = Pin(14, Pin.IN, Pin.PULL_UP)
button_b = Pin(15, Pin.IN, Pin.PULL_UP)
`;
    
    setup = `
# 辅助函数实现...
# (类似ESP32的实现)
`;
  }
  
  // 生成完整代码
  let fullCode = imports + setup + `
# 主程序
print("RustBlock程序开始运行!")

# 主循环
while True:
${python.prefixLines(code, '    ')}
    sleep(10)  # 避免CPU占用过高
`;

  return fullCode;
}