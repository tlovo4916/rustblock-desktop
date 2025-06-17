import * as Blockly from 'blockly';

// 定义自定义块的颜色
const ROBOT_HUE = 160;  // 绿色
const SENSOR_HUE = 210; // 蓝色
const LOGIC_HUE = 210;  // 蓝色
const LOOP_HUE = 120;   // 深绿色
const MATH_HUE = 230;   // 紫色
const TEXT_HUE = 160;   // 绿色
const VARIABLE_HUE = 330; // 红色
const PROCEDURE_HUE = 290; // 紫色

// 机器人控制块
export const robotBlocks = {
  blocks: [
    {
      type: 'robot_move_forward',
      message0: '向前移动 %1 步',
      args0: [
        {
          type: 'field_number',
          name: 'STEPS',
          value: 1,
          min: 0,
          max: 100
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '让机器人向前移动指定步数',
      helpUrl: ''
    },
    {
      type: 'robot_turn',
      message0: '转向 %1 %2 度',
      args0: [
        {
          type: 'field_dropdown',
          name: 'DIRECTION',
          options: [
            ['左', 'LEFT'],
            ['右', 'RIGHT']
          ]
        },
        {
          type: 'field_number',
          name: 'DEGREES',
          value: 90,
          min: 0,
          max: 360
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '让机器人向左或向右转指定角度',
      helpUrl: ''
    },
    {
      type: 'robot_stop',
      message0: '停止',
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '让机器人停止移动',
      helpUrl: ''
    },
    {
      type: 'robot_set_speed',
      message0: '设置速度为 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SPEED',
          options: [
            ['慢速', 'SLOW'],
            ['中速', 'MEDIUM'],
            ['快速', 'FAST']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '设置机器人的移动速度',
      helpUrl: ''
    }
  ]
};

// LED控制块
export const ledBlocks = {
  blocks: [
    {
      type: 'led_on',
      message0: 'LED %1 开启',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: [
            ['13', '13'],
            ['12', '12'],
            ['11', '11'],
            ['10', '10']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '打开指定引脚的LED',
      helpUrl: ''
    },
    {
      type: 'led_off',
      message0: 'LED %1 关闭',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: [
            ['13', '13'],
            ['12', '12'],
            ['11', '11'],
            ['10', '10']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '关闭指定引脚的LED',
      helpUrl: ''
    },
    {
      type: 'led_blink',
      message0: 'LED %1 闪烁 %2 次',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: [
            ['13', '13'],
            ['12', '12'],
            ['11', '11'],
            ['10', '10']
          ]
        },
        {
          type: 'field_number',
          name: 'TIMES',
          value: 3,
          min: 1,
          max: 10
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '让LED闪烁指定次数',
      helpUrl: ''
    },
    {
      type: 'rgb_led_color',
      message0: 'RGB LED 设置颜色 红:%1 绿:%2 蓝:%3',
      args0: [
        {
          type: 'field_number',
          name: 'RED',
          value: 255,
          min: 0,
          max: 255
        },
        {
          type: 'field_number',
          name: 'GREEN',
          value: 0,
          min: 0,
          max: 255
        },
        {
          type: 'field_number',
          name: 'BLUE',
          value: 0,
          min: 0,
          max: 255
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '设置RGB LED的颜色',
      helpUrl: ''
    }
  ]
};

// 传感器块
export const sensorBlocks = {
  blocks: [
    {
      type: 'sensor_distance',
      message0: '距离传感器',
      output: 'Number',
      colour: SENSOR_HUE,
      tooltip: '获取超声波距离传感器的读数（厘米）',
      helpUrl: ''
    },
    {
      type: 'sensor_light',
      message0: '光线传感器',
      output: 'Number',
      colour: SENSOR_HUE,
      tooltip: '获取光线传感器的读数（0-1023）',
      helpUrl: ''
    },
    {
      type: 'sensor_temperature',
      message0: '温度传感器',
      output: 'Number',
      colour: SENSOR_HUE,
      tooltip: '获取温度传感器的读数（摄氏度）',
      helpUrl: ''
    },
    {
      type: 'sensor_button',
      message0: '按钮 %1 被按下？',
      args0: [
        {
          type: 'field_dropdown',
          name: 'BUTTON',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['A+B', 'AB']
          ]
        }
      ],
      output: 'Boolean',
      colour: SENSOR_HUE,
      tooltip: '检查按钮是否被按下',
      helpUrl: ''
    },
    {
      type: 'sensor_touch',
      message0: '触摸传感器 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'PIN',
          options: [
            ['P0', 'P0'],
            ['P1', 'P1'],
            ['P2', 'P2']
          ]
        }
      ],
      output: 'Boolean',
      colour: SENSOR_HUE,
      tooltip: '检查触摸传感器是否被触摸',
      helpUrl: ''
    }
  ]
};

// 声音块
export const soundBlocks = {
  blocks: [
    {
      type: 'sound_play_tone',
      message0: '播放音调 %1 持续 %2 毫秒',
      args0: [
        {
          type: 'field_dropdown',
          name: 'TONE',
          options: [
            ['C', '262'],
            ['D', '294'],
            ['E', '330'],
            ['F', '349'],
            ['G', '392'],
            ['A', '440'],
            ['B', '494']
          ]
        },
        {
          type: 'field_number',
          name: 'DURATION',
          value: 500,
          min: 100,
          max: 2000
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '播放指定音调',
      helpUrl: ''
    },
    {
      type: 'sound_play_melody',
      message0: '播放旋律 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'MELODY',
          options: [
            ['生日快乐', 'BIRTHDAY'],
            ['小星星', 'TWINKLE'],
            ['欢乐颂', 'ODE_TO_JOY']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '播放预设的旋律',
      helpUrl: ''
    }
  ]
};

// 显示块（用于有显示屏的设备）
export const displayBlocks = {
  blocks: [
    {
      type: 'display_show_text',
      message0: '显示文字 %1',
      args0: [
        {
          type: 'field_input',
          name: 'TEXT',
          text: 'Hello!'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '在显示屏上显示文字',
      helpUrl: ''
    },
    {
      type: 'display_show_number',
      message0: '显示数字 %1',
      args0: [
        {
          type: 'input_value',
          name: 'NUMBER',
          check: 'Number'
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '在显示屏上显示数字',
      helpUrl: ''
    },
    {
      type: 'display_clear',
      message0: '清空显示屏',
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '清空显示屏内容',
      helpUrl: ''
    },
    {
      type: 'display_show_image',
      message0: '显示图案 %1',
      args0: [
        {
          type: 'field_dropdown',
          name: 'IMAGE',
          options: [
            ['😊 笑脸', 'HAPPY'],
            ['😢 哭脸', 'SAD'],
            ['❤️ 爱心', 'HEART'],
            ['⬆️ 箭头', 'ARROW_UP'],
            ['✓ 对勾', 'CHECK']
          ]
        }
      ],
      previousStatement: null,
      nextStatement: null,
      colour: ROBOT_HUE,
      tooltip: '在显示屏上显示预设图案',
      helpUrl: ''
    }
  ]
};

// 事件块
export const eventBlocks = {
  blocks: [
    {
      type: 'event_when_started',
      message0: '当程序启动时',
      nextStatement: null,
      colour: PROCEDURE_HUE,
      tooltip: '程序开始运行时执行',
      helpUrl: ''
    },
    {
      type: 'event_when_button_pressed',
      message0: '当按钮 %1 被按下时',
      args0: [
        {
          type: 'field_dropdown',
          name: 'BUTTON',
          options: [
            ['A', 'A'],
            ['B', 'B'],
            ['A+B', 'AB']
          ]
        }
      ],
      nextStatement: null,
      colour: PROCEDURE_HUE,
      tooltip: '当指定按钮被按下时执行',
      helpUrl: ''
    },
    {
      type: 'event_when_sensor_value',
      message0: '当 %1 %2 %3 时',
      args0: [
        {
          type: 'field_dropdown',
          name: 'SENSOR',
          options: [
            ['距离', 'DISTANCE'],
            ['光线', 'LIGHT'],
            ['温度', 'TEMPERATURE']
          ]
        },
        {
          type: 'field_dropdown',
          name: 'OPERATOR',
          options: [
            ['>', 'GT'],
            ['<', 'LT'],
            ['=', 'EQ']
          ]
        },
        {
          type: 'field_number',
          name: 'VALUE',
          value: 10
        }
      ],
      nextStatement: null,
      colour: PROCEDURE_HUE,
      tooltip: '当传感器值满足条件时执行',
      helpUrl: ''
    }
  ]
};

// 注册所有自定义块
export function registerCustomBlocks() {
  const allBlocks = [
    ...robotBlocks.blocks,
    ...ledBlocks.blocks,
    ...sensorBlocks.blocks,
    ...soundBlocks.blocks,
    ...displayBlocks.blocks,
    ...eventBlocks.blocks
  ];

  allBlocks.forEach(block => {
    Blockly.Blocks[block.type] = {
      init: function() {
        this.jsonInit(block);
      }
    };
  });
}

// 定义工具箱类别
export const toolboxCategories = [
  {
    name: '事件',
    colour: PROCEDURE_HUE,
    blocks: eventBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: '机器人',
    colour: ROBOT_HUE,
    blocks: robotBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: 'LED控制',
    colour: ROBOT_HUE,
    blocks: ledBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: '传感器',
    colour: SENSOR_HUE,
    blocks: sensorBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: '声音',
    colour: ROBOT_HUE,
    blocks: soundBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: '显示',
    colour: ROBOT_HUE,
    blocks: displayBlocks.blocks.map(b => ({ type: b.type }))
  },
  {
    name: '逻辑',
    colour: LOGIC_HUE,
    blocks: ['controls_if', 'logic_compare', 'logic_operation', 'logic_negate', 'logic_boolean']
  },
  {
    name: '循环',
    colour: LOOP_HUE,
    blocks: ['controls_repeat_ext', 'controls_whileUntil', 'controls_for']
  },
  {
    name: '数学',
    colour: MATH_HUE,
    blocks: ['math_number', 'math_arithmetic', 'math_random_int']
  },
  {
    name: '变量',
    colour: VARIABLE_HUE,
    custom: 'VARIABLE'
  }
];