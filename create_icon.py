#!/usr/bin/env python3
"""
创建一个简单的ICO图标文件供Tauri使用
"""

from PIL import Image, ImageDraw
import os

def create_simple_icon():
    # 创建一个32x32的图标
    size = 32
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # 绘制一个简单的彩色方块图标
    # 背景圆形
    draw.ellipse([2, 2, size-2, size-2], fill=(52, 152, 219, 255))
    
    # 绘制一个简单的"R"字母
    draw.rectangle([8, 8, 12, 24], fill=(255, 255, 255, 255))
    draw.rectangle([8, 8, 20, 12], fill=(255, 255, 255, 255))
    draw.rectangle([8, 14, 18, 18], fill=(255, 255, 255, 255))
    draw.rectangle([16, 18, 20, 24], fill=(255, 255, 255, 255))
    
    # 保存为ICO格式
    os.makedirs('icons', exist_ok=True)
    image.save('icons/icon.ico', format='ICO', sizes=[(32, 32)])
    print("✅ 创建了 icons/icon.ico")
    
    # 也创建PNG版本
    image.save('icons/icon.png', format='PNG')
    print("✅ 创建了 icons/icon.png")

if __name__ == "__main__":
    try:
        create_simple_icon()
    except ImportError:
        print("❌ 需要安装 Pillow: pip install Pillow")
    except Exception as e:
        print(f"❌ 创建图标失败: {e}") 