import { useState } from 'react';
import MainLayout from './components/MainLayout';
import LicenseScreen from './components/LicenseScreen';

const STORAGE_KEY = 'shotai_license_validated';

function App() {
  const [isValidated, setIsValidated] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (!isValidated) {
    return <LicenseScreen onValidated={() => setIsValidated(true)} />;
  }

  return <MainLayout />;
}

export default App;
