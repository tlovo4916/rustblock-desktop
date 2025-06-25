import React, { useMemo } from 'react';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLocale } from '../contexts/LocaleContext';
import { useTheme } from '../contexts/ThemeContext';
import { Locale } from '../locales';

const { Option } = Select;

const LanguageToggle: React.FC = () => {
  const { locale, setLocale } = useLocale();
  const { isDarkMode } = useTheme();

  const languages: { value: Locale; label: string; flag: string }[] = [
    { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  // 计算最适合的宽度
  const optimalWidth = useMemo(() => {
    // 中文需要更多空间，英文相对较少
    return locale === 'zh-CN' ? 135 : 120;
  }, [locale]);

  return (
    <Select
      value={locale}
      onChange={setLocale}
      style={{ width: optimalWidth, transition: 'width 0.2s ease' }}
      suffixIcon={<GlobalOutlined />}
      dropdownStyle={{ minWidth: 135 }}
      className={isDarkMode ? 'dark-select' : 'light-select'}
    >
      {languages.map((lang) => (
        <Option key={lang.value} value={lang.value}>
          <span style={{ marginRight: 8 }}>{lang.flag}</span>
          {lang.label}
        </Option>
      ))}
    </Select>
  );
};

export default LanguageToggle;