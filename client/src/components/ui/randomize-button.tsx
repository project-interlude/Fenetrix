import React from 'react';
import { Button } from '@/components/ui/button';
import { useKickGenerator } from '@/components/audio/KickGenerator';
import { Dices } from 'lucide-react'; 

export const RandomizeButton: React.FC = () => {
  const { randomizeParameters } = useKickGenerator();

  return (
    <Button 
      variant="default" 
      className="bg-gradient-to-r from-green-500 to-green-400 hover:from-green-600 hover:to-green-500 text-black font-bold shadow-lg hover:shadow-green-500/30 transition-all duration-150 flex items-center gap-2"
      onClick={randomizeParameters}
    >
      <Dices className="h-5 w-5" />
      <span>Randomize</span>
    </Button>
  );
};