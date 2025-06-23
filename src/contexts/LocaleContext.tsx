import React, { createContext, useContext, useState, useEffect } from 'react';
import { locales, Locale, LocaleMessages, defaultLocale } from '../locales';

interface LocaleContextType {
  locale: Locale;
  messages: LocaleMessages;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};

interface LocaleProviderProps {
  children: React.ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    // 从本地存储读取语言设置
    const savedLocale = localStorage.getItem('locale') as Locale;
    return savedLocale && savedLocale in locales ? savedLocale : defaultLocale;
  });

  const messages = locales[locale];

  useEffect(() => {
    // 保存语言设置到本地存储
    localStorage.setItem('locale', locale);
    
    // 更新文档语言属性
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (newLocale: Locale) => {
    if (newLocale in locales) {
      setLocaleState(newLocale);
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, messages, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

// 便捷的翻译钩子
export const useTranslation = () => {
  const { messages } = useLocale();
  
  const t = (path: string): string => {
    const keys = path.split('.');
    let value: any = messages;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return path; // 返回路径作为后备
      }
    }
    
    return typeof value === 'string' ? value : path;
  };
  
  return { t };
};