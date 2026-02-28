import React from 'react';
import Apple from './Apple';
import Pencil from './Pencil';

interface ConceptVisualProps {
  type: 'counting' | 'addition' | 'subtraction';
  step: number;
}

const ConceptVisual: React.FC<ConceptVisualProps> = ({ type, step }) => {
  if (type === 'counting') {
    return (
      <div className="flex flex-col items-center gap-8">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90 mb-4">
              <span className="font-semibold text-primary">Counting</span> means finding out how many things there are.
            </p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Let's count these apples together:</p>
            <div className="flex justify-center gap-4 mb-4">
              <div className="flex flex-col items-center">
                <Apple size="md" className="pointer-events-none" />
                <span className="text-2xl font-bold text-primary mt-2">1</span>
              </div>
            </div>
            <p className="text-center text-foreground">We say "one" for the first apple</p>
          </div>
        )}
        
        {step >= 3 && (
          <div className="animate-concept-delay-2 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Now let's count more:</p>
            <div className="flex justify-center gap-4 mb-4">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <Apple size="md" className="pointer-events-none" />
                  <span className="text-2xl font-bold text-primary mt-2">{num}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-foreground">We count: "one, two, three" - that's 3 apples!</p>
          </div>
        )}
        
        {step >= 4 && (
          <div className="animate-concept-delay-3 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Numbers tell us "how many":</p>
            <div className="flex justify-center gap-6 flex-wrap">
              {[1, 2, 3, 4, 5].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <span className="text-3xl font-semibold text-accent">{num}</span>
                  <div className="flex gap-1 mt-2">
                    {Array.from({ length: num }).map((_, i) => (
                      <div key={i} className="w-3 h-3 rounded-full bg-primary" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {step >= 5 && (
          <div className="animate-concept-delay-4 text-center">
            <p className="text-lg text-foreground/90">
              The <span className="font-semibold text-accent">last number</span> we say is how many there are in total!
            </p>
          </div>
        )}
      </div>
    );
  }
  
  if (type === 'addition') {
    return (
      <div className="flex flex-col items-center gap-8">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90">
              <span className="font-semibold text-venus">Addition</span> means putting things together.
            </p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Imagine you have 2 pencils:</p>
            <div className="flex justify-center gap-3 mb-4">
              <Pencil size="lg" className="pointer-events-none" />
              <Pencil size="lg" className="pointer-events-none" />
            </div>
          </div>
        )}
        
        {step >= 3 && (
          <div className="animate-concept-delay-2 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Your friend gives you 1 more:</p>
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="flex gap-3">
                <Pencil size="lg" className="pointer-events-none" />
                <Pencil size="lg" className="pointer-events-none" />
              </div>
              <span className="text-4xl font-bold text-venus">+</span>
              <Pencil size="lg" className="pointer-events-none" />
            </div>
          </div>
        )}
        
        {step >= 4 && (
          <div className="animate-concept-delay-3 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Now count them all together:</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <Pencil size="lg" className="pointer-events-none" />
                  <span className="text-xl font-bold text-venus mt-2">{num}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-foreground text-xl font-semibold">
              2 <span className="text-venus">+</span> 1 <span className="text-muted-foreground">=</span> 3
            </p>
          </div>
        )}
        
        {step >= 5 && (
          <div className="animate-concept-delay-4 text-center">
            <p className="text-lg text-foreground/90">
              The <span className="text-2xl text-venus font-bold">+</span> sign means "add" or "plus"
            </p>
            <p className="text-muted-foreground mt-2">
              The answer is called the <span className="font-semibold text-accent">sum</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  
  if (type === 'subtraction') {
    return (
      <div className="flex flex-col items-center gap-8">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90">
              <span className="font-semibold text-earth">Subtraction</span> means taking things away.
            </p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Imagine you have 4 pencils:</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <Pencil size="lg" className="pointer-events-none" />
                  <span className="text-xl font-bold text-earth mt-2">{num}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {step >= 3 && (
          <div className="animate-concept-delay-2 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">You give 1 pencil to a friend:</p>
            <div className="flex justify-center items-center gap-4 mb-4">
              <div className="flex gap-3">
                <Pencil size="lg" className="pointer-events-none" />
                <Pencil size="lg" className="pointer-events-none" />
                <Pencil size="lg" className="pointer-events-none" />
              </div>
              <span className="text-4xl font-bold text-earth">−</span>
              <div className="opacity-40">
                <Pencil size="lg" className="pointer-events-none" />
              </div>
            </div>
          </div>
        )}
        
        {step >= 4 && (
          <div className="animate-concept-delay-3 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">Now count how many you have left:</p>
            <div className="flex justify-center gap-3 mb-4">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <Pencil size="lg" className="pointer-events-none" />
                  <span className="text-xl font-bold text-earth mt-2">{num}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-foreground text-xl font-semibold">
              4 <span className="text-earth">−</span> 1 <span className="text-muted-foreground">=</span> 3
            </p>
          </div>
        )}
        
        {step >= 5 && (
          <div className="animate-concept-delay-4 text-center">
            <p className="text-lg text-foreground/90">
              The <span className="text-2xl text-earth font-bold">−</span> sign means "subtract" or "minus"
            </p>
            <p className="text-muted-foreground mt-2">
              The answer is called the <span className="font-semibold text-accent">difference</span>
            </p>
          </div>
        )}
      </div>
    );
  }
  
  return null;
};

export default ConceptVisual;
