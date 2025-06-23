import React from 'react';
import PageContainer from '../components/PageContainer';
import { useTranslation } from '../contexts/LocaleContext';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageContainer>
      <h1>{t('home.welcome')}</h1>
      <div
        style={{
          padding: 24,
          borderRadius: 8,
          backgroundColor: 'var(--bg-secondary, #f5f5f5)',
          border: '1px solid var(--border-color, #d9d9d9)',
        }}
      >
        <h2>{t('home.subtitle')}</h2>
        <p>{t('home.description')}</p>

        <div style={{ marginTop: 32 }}>
          <h3>{t('home.features')}</h3>
          <ul>
            <li>{t('home.feature1')}</li>
            <li>{t('home.feature2')}</li>
            <li>{t('home.feature3')}</li>
            <li>{t('home.feature4')}</li>
          </ul>
        </div>

        <div style={{ marginTop: 32 }}>
          <h3>{t('home.quickStart')}</h3>
          <ol>
            <li>{t('home.step1')}</li>
            <li>{t('home.step2')}</li>
            <li>{t('home.step3')}</li>
            <li>{t('home.step4')}</li>
          </ol>
        </div>
      </div>
    </PageContainer>
  );
};

export default HomePage;
