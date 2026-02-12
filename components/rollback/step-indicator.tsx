'use client';

import { CheckCircle2 } from 'lucide-react';

export interface Step {
  id: number;
  name: string;
  description: string;
}

export interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: 'full' | 'compact';
}

export function StepIndicator({ steps, currentStep, variant = 'compact' }: StepIndicatorProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`w-2 h-2 rounded-full transition-colors ${
              currentStep > step.id ? 'bg-green-500' :
              currentStep === step.id ? 'bg-primary' :
              'bg-muted'
            }`}
            aria-label={`Step ${step.id}: ${step.name}`}
            title={step.name}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
              currentStep > step.id
                ? 'bg-green-500 text-white'
                : currentStep === step.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {currentStep > step.id ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                step.id
              )}
            </div>
            <div className={`ml-3 ${index < steps.length - 1 ? 'mr-8' : ''}`}>
              <p className={`text-sm font-medium ${
                currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                {step.name}
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {step.description}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-px mx-4 transition-colors ${
                currentStep > step.id ? 'bg-green-500' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
