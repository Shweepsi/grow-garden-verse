
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
      <div className="relative bg-white rounded-lg shadow-lg p-2 border-2 border-blue-300 min-w-[120px]">
        {/* Robot header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <Bot className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Auto-Bot</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowPlantSelector(true)}
            className="h-6 w-6 p-0 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>

        {/* Plant info */}
        {selectedPlantType ? (
          <div className="flex items-center gap-1 bg-blue-50 rounded px-2 py-1">
            <span className="text-sm">{selectedPlantType.emoji}</span>
            <span className="text-xs font-medium text-blue-700 truncate">
              {selectedPlantType.display_name}
            </span>
          </div>
        ) : (
          <div className="text-xs text-gray-500 text-center py-1">
            Choisir plante
          </div>
        )}

        {/* Status indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
          isActive && selectedPlantType ? 'bg-green-400 animate-pulse' : 'bg-gray-300'
        }`}></div>
      </div>

      {/* Plant selector */}
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
