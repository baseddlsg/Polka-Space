import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface FormValidationProps {
  errors?: string[];
  warnings?: string[];
  success?: string[];
  className?: string;
}

/**
 * Form validation feedback component
 */
export const FormValidation: React.FC<FormValidationProps> = ({
  errors = [],
  warnings = [],
  success = [],
  className = ''
}) => {
  if (errors.length === 0 && warnings.length === 0 && success.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Errors */}
      {errors.map((error, index) => (
        <div key={`error-${index}`} className="flex items-start gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
      
      {/* Warnings */}
      {warnings.map((warning, index) => (
        <div key={`warning-${index}`} className="flex items-start gap-2 text-sm text-yellow-600">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      ))}
      
      {/* Success */}
      {success.map((message, index) => (
        <div key={`success-${index}`} className="flex items-start gap-2 text-sm text-green-600">
          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{message}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * Validation utilities
 */
export const validateField = (value: any, rules: ValidationRule): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    errors.push('This field is required');
  }

  // Skip other validations if value is empty and not required
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return { isValid: errors.length === 0, errors, warnings };
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`Must be at least ${rules.minLength} characters`);
    }
    
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`Must be no more than ${rules.maxLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push('Invalid format');
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) {
      errors.push(customError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * NFT-specific validation rules
 */
export const nftValidationRules = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-_]+$/
  } as ValidationRule,
  
  description: {
    required: true,
    minLength: 10,
    maxLength: 1000
  } as ValidationRule,
  
  walletAddress: {
    required: true,
    pattern: /^[1-9A-HJ-NP-Za-km-z]{44,48}$/, // Basic Polkadot address pattern
    custom: (value: string) => {
      if (value && !value.startsWith('5')) {
        return 'Polkadot addresses should start with "5"';
      }
      return null;
    }
  } as ValidationRule,
  
  modelUrl: {
    required: true,
    pattern: /^https?:\/\/.+\.(glb|gltf)$/i,
    custom: (value: string) => {
      if (value && !value.includes('.glb') && !value.includes('.gltf')) {
        return 'Only GLB and GLTF model formats are supported';
      }
      return null;
    }
  } as ValidationRule,
  
  attributeValue: {
    required: true,
    minLength: 1,
    maxLength: 50
  } as ValidationRule
};

/**
 * Validate entire NFT metadata object
 */
export const validateNFTMetadata = (metadata: any): ValidationResult => {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate name
  if (metadata.name !== undefined) {
    const nameResult = validateField(metadata.name, nftValidationRules.name);
    allErrors.push(...nameResult.errors.map(e => `Name: ${e}`));
    allWarnings.push(...nameResult.warnings.map(w => `Name: ${w}`));
  }

  // Validate description
  if (metadata.description !== undefined) {
    const descResult = validateField(metadata.description, nftValidationRules.description);
    allErrors.push(...descResult.errors.map(e => `Description: ${e}`));
    allWarnings.push(...descResult.warnings.map(w => `Description: ${w}`));
  }

  // Validate model URL
  if (metadata.model?.url !== undefined) {
    const modelResult = validateField(metadata.model.url, nftValidationRules.modelUrl);
    allErrors.push(...modelResult.errors.map(e => `Model URL: ${e}`));
    allWarnings.push(...modelResult.warnings.map(w => `Model URL: ${w}`));
  }

  // Validate attributes
  if (metadata.attributes && Array.isArray(metadata.attributes)) {
    metadata.attributes.forEach((attr: any, index: number) => {
      if (!attr.trait_type || !attr.value) {
        allErrors.push(`Attribute ${index + 1}: Both trait type and value are required`);
      } else {
        const traitResult = validateField(attr.trait_type, nftValidationRules.attributeValue);
        const valueResult = validateField(attr.value, nftValidationRules.attributeValue);
        
        allErrors.push(...traitResult.errors.map(e => `Attribute ${index + 1} trait: ${e}`));
        allErrors.push(...valueResult.errors.map(e => `Attribute ${index + 1} value: ${e}`));
      }
    });
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Real-time validation hook
 */
export const useFormValidation = (initialValues: Record<string, any>, rules: Record<string, ValidationRule>) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validateField = React.useCallback((fieldName: string, value: any) => {
    const rule = rules[fieldName];
    if (!rule) return { isValid: true, errors: [], warnings: [] };
    
    return validateField(value, rule);
  }, [rules]);

  const setValue = React.useCallback((fieldName: string, value: any) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate if field has been touched
    if (touched[fieldName]) {
      const result = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: result.errors }));
    }
  }, [validateField, touched]);

  const markFieldTouched = React.useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate when field is touched
    const result = validateField(fieldName, values[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: result.errors }));
  }, [validateField, values]);

  const validateAll = React.useCallback(() => {
    const allErrors: Record<string, string[]> = {};
    let isValid = true;

    Object.keys(rules).forEach(fieldName => {
      const result = validateField(fieldName, values[fieldName]);
      if (result.errors.length > 0) {
        allErrors[fieldName] = result.errors;
        isValid = false;
      }
    });

    setErrors(allErrors);
    setTouched(Object.keys(rules).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    
    return { isValid, errors: allErrors };
  }, [rules, validateField, values]);

  return {
    values,
    errors,
    touched,
    setValue,
    setTouched: markFieldTouched,
    validateAll,
    isValid: Object.keys(errors).every(key => errors[key].length === 0)
  };
};

export default FormValidation;