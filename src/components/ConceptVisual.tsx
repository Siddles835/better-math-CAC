import { tx } from '@/i18n/tx';
import React, { useState } from 'react';
import Apple from './Apple';
import Pencil from './Pencil';
import ReadAloudButton from './ReadAloudButton';

interface ConceptVisualProps {
  type: 'counting' | 'addition' | 'subtraction';
  step: number;
}

const countingStepNarration = (step: number) => {
  const parts: string[] = [];
  if (step >= 1) parts.push(tx('ui:s_cb8902b07b'));
  if (step >= 2) parts.push(tx('ui:s_2f53930f76'));
  if (step >= 3) parts.push(tx('ui:s_b596df22fd'));
  if (step >= 4) parts.push(tx('ui:s_0eacc6e9fb'));
  if (step >= 5) parts.push(tx('ui:s_73e91eb264'));
  return parts.join(' ');
};

const additionStepNarration = (step: number) => {
  const parts: string[] = [];
  if (step >= 1) parts.push(tx('ui:s_b07f849704'));
  if (step >= 2) parts.push(tx('ui:s_f6a49b3395'));
  if (step >= 3) parts.push(tx('ui:s_d3ee33cb94'));
  if (step >= 4) parts.push(tx('ui:s_sumName'));
  return parts.join(' ');
};

const subtractionStepNarration = (step: number) => {
  const parts: string[] = [];
  if (step >= 1) parts.push(tx('ui:s_6478f15af9'));
  if (step >= 2) parts.push(tx('ui:s_c187e37438'));
  if (step >= 3) parts.push(tx('ui:s_3774b73753'));
  if (step >= 4) parts.push(tx('ui:s_diffName'));
  return parts.join(' ');
};

const HearLessonPrompt: React.FC<{ text: string }> = ({ text }) => {
  const [heard, setHeard] = useState(false);
  return (
    <div className="flex flex-col items-center gap-1 animate-fade-in pt-2">
      <ReadAloudButton text={text} autoPlay onPlayed={() => setHeard(true)} />
      <span className="text-xs sm:text-sm text-muted-foreground">
        {heard ? 'Tap to hear this again' : 'Tap to hear this'}
      </span>
    </div>
  );
};

const ConceptVisual: React.FC<ConceptVisualProps> = ({ type, step }) => {
  if (type === 'counting') {
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-8 w-full px-1">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90 mb-4">
              {tx('ui:s_cb8902b07b')}</p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_701531d5d8')}</p>
            <div className="flex justify-center gap-4 mb-4">
              <div className="flex flex-col items-center">
                <Apple size="lg" className="pointer-events-none" />
                <span className="text-2xl font-bold text-primary mt-2">1</span>
              </div>
            </div>
            <p className="text-center text-foreground">{tx('ui:s_2f53930f76')}</p>
          </div>
        )}
        
        {step >= 3 && (
          <div className="animate-concept-delay-2 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_899e3dcb7b')}</p>
            <div className="flex justify-center gap-4 mb-4">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex flex-col items-center">
                  <Apple size="lg" className="pointer-events-none" />
                  <span className="text-2xl font-bold text-primary mt-2">{num}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-foreground">{tx('ui:s_b596df22fd')}</p>
          </div>
        )}
        
        {step >= 4 && (
          <div className="animate-concept-delay-3 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_0eacc6e9fb')}</p>
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
              {tx('ui:s_73e91eb264')}</p>
          </div>
        )}

        {step >= 6 && (
          <div className="animate-concept-delay-5 bg-card rounded-xl p-3 sm:p-6 border border-border w-full max-w-md">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_c102eccbe8')}</p>
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-2 max-w-[120px]">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-primary" />
                  ))}
                </div>
                <span className="text-xl font-bold text-primary mt-2">3</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex flex-wrap justify-center gap-2 max-w-[120px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-accent" />
                  ))}
                </div>
                <span className="text-xl font-bold text-accent mt-2">5</span>
              </div>
            </div>
          </div>
        )}
        {step >= 7 && <HearLessonPrompt text={countingStepNarration(6)} />}
      </div>
    );
  }
  
  if (type === 'addition') {
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-8 w-full px-1">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90">
              {tx('ui:s_b07f849704')}</p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_d1a30123a7')}</p>
            <div className="flex justify-center gap-3 mb-4">
              <Pencil size="lg" className="pointer-events-none" />
              <Pencil size="lg" className="pointer-events-none" />
            </div>
          </div>
        )}
        
        {step >= 3 && (
          <div className="animate-concept-delay-2 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_67d346279e')}</p>
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
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_f6a49b3395')}</p>
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
              <span className="text-2xl text-venus font-bold" dir="ltr">+</span> {tx('ui:s_d3ee33cb94')}</p>
            <p className="text-muted-foreground mt-2">{tx('ui:s_sumName')}
            </p>
          </div>
        )}
        {step >= 6 && <HearLessonPrompt text={additionStepNarration(5)} />}
      </div>
    );
  }
  
  if (type === 'subtraction') {
    return (
      <div className="flex flex-col items-center gap-4 sm:gap-8 w-full px-1">
        {step >= 1 && (
          <div className="animate-concept text-center">
            <p className="text-xl text-foreground/90">
              {tx('ui:s_6478f15af9')}</p>
          </div>
        )}
        
        {step >= 2 && (
          <div className="animate-concept-delay-1 bg-card rounded-xl p-6 border border-border">
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_ac6f9848be')}</p>
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
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_f0b93f50ea')}</p>
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
            <p className="text-muted-foreground mb-4 text-center">{tx('ui:s_c187e37438')}</p>
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
              <span className="text-2xl text-earth font-bold" dir="ltr">−</span> {tx('ui:s_3774b73753')}</p>
            <p className="text-muted-foreground mt-2">{tx('ui:s_diffName')}
            </p>
          </div>
        )}
        {step >= 6 && <HearLessonPrompt text={subtractionStepNarration(5)} />}
      </div>
    );
  }
  
  return null;
};

export default ConceptVisual;
