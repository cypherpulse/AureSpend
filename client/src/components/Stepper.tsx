import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <div className="flex items-center w-full mb-8" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={steps.length}>
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isActive = i === currentStep;

        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? "hsl(24 100% 50%)"
                    : isActive
                    ? "hsl(24 100% 50% / 0.2)"
                    : "hsl(0 0% 12%)",
                  borderColor: isCompleted || isActive
                    ? "hsl(24 100% 50%)"
                    : "hsl(0 0% 20%)",
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 text-xs font-bold"
              >
                {isCompleted ? (
                  <Check size={14} className="text-primary-foreground" />
                ) : (
                  <span className={isActive ? "text-primary" : "text-muted-foreground"}>
                    {i + 1}
                  </span>
                )}
              </motion.div>
              <span
                className={`text-[10px] mt-1.5 font-medium whitespace-nowrap ${
                  isActive ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-2 h-0.5 rounded-full bg-border relative overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: isCompleted ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-y-0 left-0 gradient-orange rounded-full"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
