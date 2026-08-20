import { useState } from 'react';
import POSLayout from '../components/POSLayout';
import CustomerSearchPOS from '../components/CustomerSearchPOS';
import MotorcycleSearchPOS from '../components/MotorcycleSearchPOS';
import TransactionReview from '../components/TransactionReview';

type POSStep = 'customer' | 'motorcycle' | 'review';

interface POSMainProps {
  lang: 'en' | 'ar';
  onBack: () => void;
}

export default function POSMain({ lang, onBack }: POSMainProps) {
  const [step, setStep] = useState<POSStep>('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedMotorcycle, setSelectedMotorcycle] = useState<any>(null);

  const isRtl = lang === 'ar';

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setStep('motorcycle');
  };

  const handleMotorcycleSelect = (motorcycle: any) => {
    setSelectedMotorcycle(motorcycle);
    setStep('review');
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('motorcycle');
    } else if (step === 'motorcycle') {
      setStep('customer');
    } else {
      onBack();
    }
  };

  const handleReset = () => {
    setSelectedCustomer(null);
    setSelectedMotorcycle(null);
    setStep('customer');
  };

  return (
    <POSLayout
      lang={lang}
      title={isRtl ? 'نقطة البيع' : 'Point of Sale'}
      onBack={handleBack}
    >
      {step === 'customer' && (
        <CustomerSearchPOS
          lang={lang}
          onSelect={handleCustomerSelect}
        />
      )}

      {step === 'motorcycle' && (
        <MotorcycleSearchPOS
          lang={lang}
          customer={selectedCustomer}
          onSelect={handleMotorcycleSelect}
          onBack={() => setStep('customer')}
        />
      )}

      {step === 'review' && selectedCustomer && selectedMotorcycle && (
        <TransactionReview
          lang={lang}
          customer={selectedCustomer}
          motorcycle={selectedMotorcycle}
          onComplete={handleReset}
          onBack={() => setStep('motorcycle')}
        />
      )}
    </POSLayout>
  );
}
