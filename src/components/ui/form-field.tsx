import React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export interface FormFieldProps {
  label?: string
  error?: string
  success?: string
  hint?: string
  required?: boolean
  className?: string
  children?: React.ReactNode
  id?: string
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  success,
  hint,
  required = false,
  className,
  children,
  id
}) => {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`
  const hasError = Boolean(error)
  const hasSuccess = Boolean(success)
  const hasHint = Boolean(hint)

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={fieldId}
          className={cn(
            'text-sm font-medium',
            hasError && 'text-destructive',
            hasSuccess && 'text-green-600 dark:text-green-400'
          )}
        >
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}

      <div className="relative">
        {React.isValidElement(children) ? (
          React.cloneElement(children as React.ReactElement<any>, {
            id: fieldId,
            className: cn(
              children.props.className,
              hasError && 'border-destructive focus-visible:ring-destructive',
              hasSuccess && 'border-green-500 focus-visible:ring-green-500'
            )
          })
        ) : (
          children
        )}

        {(hasError || hasSuccess) && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {hasError ? (
              <AlertCircle className="w-4 h-4 text-destructive" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            )}
          </div>
        )}
      </div>

      {(error || success || hint) && (
        <div className="space-y-1">
          {error && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              {error}
            </p>
          )}
          {success && !error && (
            <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />
              {success}
            </p>
          )}
          {hint && !error && !success && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 flex-shrink-0" />
              {hint}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Enhanced Input with built-in validation states
interface EnhancedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  containerClassName?: string
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  label,
  error,
  success,
  hint,
  required,
  containerClassName,
  className,
  ...props
}) => (
  <FormField
    label={label}
    error={error}
    success={success}
    hint={hint}
    required={required}
    className={containerClassName}
    id={props.id}
  >
    <Input className={className} {...props} />
  </FormField>
)

// Enhanced Textarea with built-in validation states
interface EnhancedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  containerClassName?: string
}

export const EnhancedTextarea: React.FC<EnhancedTextareaProps> = ({
  label,
  error,
  success,
  hint,
  required,
  containerClassName,
  className,
  ...props
}) => (
  <FormField
    label={label}
    error={error}
    success={success}
    hint={hint}
    required={required}
    className={containerClassName}
    id={props.id}
  >
    <Textarea className={className} {...props} />
  </FormField>
)

// Field validation helpers
export const validateRequired = (value: string | number | undefined | null): string | undefined => {
  if (value === undefined || value === null || value === '') {
    return 'This field is required'
  }
}

export const validateEmail = (email: string): string | undefined => {
  if (!email) return validateRequired(email)
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email address'
  }
}

export const validatePassword = (password: string): string | undefined => {
  if (!password) return validateRequired(password)
  
  if (password.length < 8) {
    return 'Password must be at least 8 characters long'
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  }
}

export const validateAmount = (amount: string | number): string | undefined => {
  if (!amount) return validateRequired(amount)
  
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) {
    return 'Please enter a valid number'
  }
  
  if (num <= 0) {
    return 'Amount must be greater than 0'
  }
  
  // Check for reasonable decimal places (2 for currency)
  if (typeof amount === 'string' && amount.includes('.')) {
    const decimals = amount.split('.')[1]
    if (decimals && decimals.length > 2) {
      return 'Amount can have at most 2 decimal places'
    }
  }
}

export const validateLength = (
  value: string, 
  min?: number, 
  max?: number
): string | undefined => {
  if (!value) return validateRequired(value)
  
  if (min && value.length < min) {
    return `Must be at least ${min} characters long`
  }
  
  if (max && value.length > max) {
    return `Must be no more than ${max} characters long`
  }
}

// Validation state hook
export const useValidation = () => {
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const setError = (field: string, error?: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error || ''
    }))
  }

  const setFieldTouched = (field: string, isTouched: boolean = true) => {
    setTouched(prev => ({
      ...prev,
      [field]: isTouched
    }))
  }

  const validateField = (field: string, value: any, validator: (value: any) => string | undefined) => {
    const error = validator(value)
    setError(field, error)
    return !error
  }

  const hasError = (field: string) => Boolean(errors[field] && touched[field])
  const getError = (field: string) => touched[field] ? errors[field] : undefined

  const clearErrors = () => {
    setErrors({})
    setTouched({})
  }

  const isValid = Object.keys(errors).every(key => !errors[key])

  return {
    errors,
    touched,
    setError,
    setTouched: setFieldTouched,
    validateField,
    hasError,
    getError,
    clearErrors,
    isValid
  }
}