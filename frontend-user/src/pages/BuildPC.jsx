// src/pages/BuildPC.jsx
import React, { useState } from 'react';
import { useStore } from '../stores/useStore';

const BuildPC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const { buildPcComponents, setPcComponent } = useStore();

  const steps = [
    { id: 'cpu', name: 'CPU', title: 'Select CPU' },
    { id: 'gpu', name: 'GPU', title: 'Select GPU' },
    { id: 'ram', name: 'RAM', title: 'Select RAM' },
    { id: 'motherboard', name: 'Motherboard', title: 'Select Motherboard' },
    { id: 'storage', name: 'Storage', title: 'Select Storage' },
    { id: 'psu', name: 'PSU', title: 'Select Power Supply' },
    { id: 'case', name: 'Case', title: 'Select Case' }
  ];

  const mockComponents = {
    cpu: [
      { id: 1, name: 'Intel Core i9-13900K', price: 589, socket: 'LGA1700' },
      { id: 2, name: 'AMD Ryzen 9 7950X', price: 699, socket: 'AM5' },
      { id: 3, name: 'Intel Core i7-13700K', price: 419, socket: 'LGA1700' }
    ],
    gpu: [
      { id: 1, name: 'RTX 4090', price: 1599, vram: '24GB' },
      { id: 2, name: 'RTX 4080', price: 1199, vram: '16GB' },
      { id: 3, name: 'RX 7900 XTX', price: 999, vram: '24GB' }
    ]
  };

  const selectedTotal = Object.values(buildPcComponents).reduce((sum, comp) => sum + (comp?.price || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8 bg-base-200 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Build Your PC</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Steps Navigation */}
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="font-bold text-lg mb-4">Build Progress</h3>
              <div className="steps steps-vertical">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`step ${index <= currentStep ? 'step-primary' : ''} ${buildPcComponents[step.id] ? 'step-success' : ''}`}
                    onClick={() => setCurrentStep(index)}
                  >
                    {step.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Component Selection */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">{steps[currentStep]?.title}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(mockComponents[steps[currentStep]?.id] || []).map(component => (
                  <div
                    key={component.id}
                    className={`card bg-base-200 cursor-pointer ${buildPcComponents[steps[currentStep]?.id]?.id === component.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setPcComponent(steps[currentStep].id, component)}
                  >
                    <div className="card-body">
                      <h3 className="card-title">{component.name}</h3>
                      <p className="text-lg font-bold text-primary">${component.price}</p>
                      <div className="text-sm opacity-75">
                        {Object.entries(component).filter(([key]) => !['id', 'name', 'price'].includes(key)).map(([key, value]) => (
                          <div key={key}>{key}: {value}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                >
                  Previous
                </button>

                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}
                  disabled={!buildPcComponents[steps[currentStep]?.id]}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="card bg-base-100 shadow-lg mt-6">
            <div className="card-body">
              <h3 className="card-title">Current Build</h3>
              <div className="space-y-2">
                {Object.entries(buildPcComponents).map(([category, component]) => (
                  <div key={category} className="flex justify-between">
                    <span>{category.toUpperCase()}:</span>
                    <span>{component?.name}</span>
                  </div>
                ))}
              </div>
              <div className="divider"></div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>DZD {selectedTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildPC;
