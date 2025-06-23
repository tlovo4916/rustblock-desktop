import React from 'react';
import { Select } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useLocale } from '../contexts/LocaleContext';
import { Locale } from '../locales';

const { Option } = Select;

const LanguageToggle: React.FC = () => {
  const { locale, setLocale } = useLocale();

  const languages: { value: Locale; label: string; flag: string }[] = [
    { value: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
    { value: 'en-US', label: 'English', flag: '🇺🇸' },
  ];

  return (
    <Select
      value={locale}
      onChange={setLocale}
      style={{ width: 120 }}
      suffixIcon={<GlobalOutlined />}
      dropdownStyle={{ minWidth: 140 }}
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