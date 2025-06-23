import React, { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const DarkModeStyles: React.FC = () => {
  const { isDarkMode } = useTheme();

  useEffect(() => {
    // 创建或更新全局样式
    let styleElement = document.getElementById('dark-mode-styles');
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dark-mode-styles';
      document.head.appendChild(styleElement);
    }

    if (isDarkMode) {
      // 使用 MutationObserver 来动态修复白色背景
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1 && node instanceof HTMLElement) {
                fixWhiteBackgrounds(node);
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 修复现有元素
      fixWhiteBackgrounds(document.body);

      // 修复函数
      function fixWhiteBackgrounds(element: HTMLElement) {
        const elements = element.querySelectorAll('*');
        elements.forEach((el) => {
          if (el instanceof HTMLElement) {
            const style = window.getComputedStyle(el);
            const bgColor = style.backgroundColor;
            
            // 检查是否是白色或接近白色的背景
            if (bgColor === 'rgb(255, 255, 255)' || 
                bgColor === 'rgba(255, 255, 255, 1)' ||
                bgColor === '#ffffff' ||
                bgColor === '#fff' ||
                bgColor === 'white') {
              
              // 排除特定组件
              if (!el.classList.contains('ant-switch') && 
                  !el.classList.contains('ant-btn-primary') &&
                  !el.closest('.ant-switch')) {
                el.style.backgroundColor = '#1f1f1f';
                el.style.color = '#e8e8e8';
              }
            }
            
            // 修复文本颜色
            const textColor = style.color;
            if (textColor === 'rgb(0, 0, 0)' || 
                textColor === 'rgba(0, 0, 0, 1)' ||
                textColor === '#000000' ||
                textColor === '#000' ||
                textColor === 'black') {
              el.style.color = '#e8e8e8';
            }
          }
        });
      }

      styleElement.textContent = `
        /* 基础暗色模式样式 */
        .dark {
          background: #141414 !important;
          color: #e8e8e8 !important;
        }
        
        /* 强制所有元素继承文本颜色 */
        .dark * {
          color: inherit;
        }
        
        /* 修复所有可能的白色背景 */
        .dark [style*="background: rgb(255"] {
          background-color: #1f1f1f !important;
          color: #e8e8e8 !important;
        }
        
        /* 修复 box-shadow */
        .dark [style*="box-shadow"] {
          box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1) !important;
        }
        
        /* 强制修复黑夜模式菜单 */
        .dark .ant-menu-item,
        .dark .ant-menu-item span,
        .dark .ant-menu-item-icon,
        .dark .ant-menu-title-content {
          color: #e8e8e8 !important;
        }
        
        .dark .ant-menu-item:hover,
        .dark .ant-menu-item:hover span,
        .dark .ant-menu-item:hover .ant-menu-item-icon,
        .dark .ant-menu-item:hover .ant-menu-title-content {
          color: #ffffff !important;
        }
        
        .dark .ant-menu-item-selected,
        .dark .ant-menu-item-selected span,
        .dark .ant-menu-item-selected .ant-menu-item-icon,
        .dark .ant-menu-item-selected .ant-menu-title-content {
          color: #1890ff !important;
        }
      `;

      return () => {
        observer.disconnect();
      };
    } else {
      styleElement.textContent = '';
    }

    return () => {
      // 清理函数
      if (styleElement && styleElement.parentNode) {
        styleElement.parentNode.removeChild(styleElement);
      }
    };
  }, [isDarkMode]);

  return null;
};

export default DarkModeStyles;