
import { useState } from 'react';
import { Bot, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlantSelector } from './PlantSelector';
import { PlantType } from '@/types/game';

interface AutoHarvestRobotProps {
  isActive: boolean;
  selectedPlantType?: PlantType;
  plantTypes: PlantType[];
  coins: number;
  onPlantSelect: (plantTypeId: string) => void;
  onToggleRobot: () => void;
}

export const AutoHarvestRobot = ({
  isActive,
  selectedPlantType,
  plantTypes,
  coins,
  onPlantSelect,
  onToggleRobot
}: AutoHarvestRobotProps) => {
  const [showPlantSelector, setShowPlantSelector] = useState(false);

  const handlePlantSelection = (plotNumber: number, plantTypeId: string, cost: number) => {
    onPlantSelect(plantTypeId);
    setShowPlantSelector(false);
  };

  return (
    <>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Robot visual */}
        <div className={`transform transition-all duration-500 ${isActive ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="relative">
            {/* Robot body */}
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg animate-pulse">
              <Bot className="h-6 w-6 text-white" />
            </div>
            
            {/* Status indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            
            {/* Plant info if selected */}
            {selectedPlantType && (
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-2 py-1 shadow-lg border border-blue-200">
                <div className="flex items-center gap-1">
                  <span className="text-sm">{selectedPlantType.emoji}</span>
                  <span className="text-xs font-medium text-blue-700">{selectedPlantType.display_name}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Robot controls */}
      {isActive && (
        <div className="absolute top-2 right-2 pointer-events-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPlantSelector(true)}
            className="bg-white/90 hover:bg-white border-blue-300 text-blue-700 h-8 w-8 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Plant selector for robot */}
      <PlantSelector
        isOpen={showPlantSelector}
        onClose={() => setShowPlantSelector(false)}
        plotNumber={1}
        plantTypes={plantTypes}
        coins={coins}
        onPlantDirect={handlePlantSelection}
      />
    </>
  );
};
