import { zhCN } from './zh-CN';
import { enUS } from './en-US';

export const locales = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export type Locale = keyof typeof locales;
export type LocaleMessages = typeof zhCN;

export const defaultLocale: Locale = 'zh-CN';