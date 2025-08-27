import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, Wifi, WifiOff } from 'lucide-react';
import { useEnhancedToast } from '@/hooks/useEnhancedToast';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { LoadingButton } from '@/components/ui/loading-states';
import { EnhancedInput, useValidation, validateRequired, validateEmail, validateAmount } from '@/components/ui/form-field';
import { useTranslation } from 'react-i18next';

export const ErrorHandlingDemo: React.FC = () => {
  const { t } = useTranslation();
  const toast = useEnhancedToast();
  const { isOnline, isSlowConnection, effectiveType, shouldShowOfflineUI } = useNetworkStatus();
  const validation = useValidation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    amount: '',
    required: ''
  });

  const handleSuccessToast = () => {
    toast.success({
      title: 'Success!',
      description: 'This demonstrates a success toast with enhanced styling and logging.'
    });
  };

  const handleErrorToast = () => {
    toast.error({
      title: 'Error Occurred',
      description: 'This shows how errors are displayed with consistent styling.',
      errorCode: 'DEMO_ERROR'
    });
  };

  const handleApiError = () => {
    const mockError = {
      message: 'Database connection failed',
      code: 'CONNECTION_ERROR',
      details: 'Unable to reach the database server'
    };
    toast.apiError(mockError, 'demo operation');
  };

  const handleNetworkError = () => {
    const mockError = new Error('Network request failed');
    toast.networkError(mockError);
  };

  const handleValidationError = () => {
    toast.validationError({
      title: 'Validation Failed',
      description: 'Please check your input and try again.'
    });
  };

  const handleLoadingDemo = async () => {
    setDemoLoading(true);
    
    toast.loading({
      title: 'Processing...',
      description: 'This demonstrates a loading state with automatic dismissal.'
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setDemoLoading(false);
    toast.success({
      title: 'Process Complete',
      description: 'Loading demo finished successfully!'
    });
  };

  const handleFormValidation = () => {
    const emailError = validateEmail(formData.email);
    const amountError = validateAmount(formData.amount);
    const requiredError = validateRequired(formData.required);

    validation.setError('email', emailError);
    validation.setError('amount', amountError);
    validation.setError('required', requiredError);
    validation.setTouched('email');
    validation.setTouched('amount');
    validation.setTouched('required');

    if (!emailError && !amountError && !requiredError) {
      toast.success({
        title: 'Valid Form',
        description: 'All form fields are valid!'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Enhanced Error Handling Demo
          </CardTitle>
          <CardDescription>
            Demonstration of the comprehensive error handling and user feedback system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Network Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
              <span className="font-medium">Network Status</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
              {isSlowConnection && (
                <Badge variant="secondary">Slow Connection</Badge>
              )}
              <Badge variant="outline">{effectiveType}</Badge>
            </div>
          </div>

          {/* Toast Demonstrations */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Toast Notifications</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Button onClick={handleSuccessToast} variant="default" size="sm">
                Success Toast
              </Button>
              <Button onClick={handleErrorToast} variant="destructive" size="sm">
                Error Toast
              </Button>
              <Button onClick={handleApiError} variant="outline" size="sm">
                API Error
              </Button>
              <Button onClick={handleNetworkError} variant="outline" size="sm">
                Network Error
              </Button>
              <Button onClick={handleValidationError} variant="outline" size="sm">
                Validation Error
              </Button>
              <LoadingButton 
                onClick={handleLoadingDemo}
                loading={demoLoading}
                loadingText="Processing..."
                size="sm"
              >
                Loading Demo
              </LoadingButton>
            </div>
          </div>

          {/* Form Validation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form Validation</h3>
            <div className="grid gap-4 max-w-md">
              <EnhancedInput
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                error={validation.getError('email')}
                hint="Must be a valid email format"
                required
              />
              
              <EnhancedInput
                label="Amount"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                error={validation.getError('amount')}
                hint="Must be greater than 0"
                required
              />
              
              <EnhancedInput
                label="Required Field"
                placeholder="This field is required"
                value={formData.required}
                onChange={(e) => setFormData({ ...formData, required: e.target.value })}
                error={validation.getError('required')}
                required
              />
              
              <Button onClick={handleFormValidation}>
                Validate Form
              </Button>
            </div>
          </div>

          {/* Error Boundary Information */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-900 dark:text-blue-100">Error Boundary Protection</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  The entire application is protected by an error boundary that catches React errors,
                  logs them automatically, and provides a user-friendly fallback UI. All errors are
                  tracked with full context for debugging.
                </p>
              </div>
            </div>
          </div>

          {/* Offline Features */}
          {shouldShowOfflineUI && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-orange-900 dark:text-orange-100">Offline Mode Active</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    You are currently offline. The app will continue to work with cached data
                    and automatically sync when connection is restored.
                  </p>
                </div>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
};