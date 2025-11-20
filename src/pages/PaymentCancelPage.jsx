import React from 'react';
    import { Link } from 'react-router-dom';
    import { XCircle } from 'lucide-react';
    import { useTranslation } from 'react-i18next';
    import Navbar from '@/components/layout/Navbar';

    const PaymentCancelPage = () => {
      const { t } = useTranslation();

      return (
        <>
          <Navbar />
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
            <div className="text-center max-w-md">
              <XCircle className="mx-auto h-24 w-24 text-destructive" />
              <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t('paymentCancel.header')}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {t('paymentCancel.message')}
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link
                  to="/wallet"
                  className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {t('paymentCancel.retryButton')}
                </Link>
                <Link to="/" className="text-sm font-semibold leading-6 text-foreground">
                  {t('paymentCancel.homeButton')} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </>
      );
    };

    export default PaymentCancelPage;