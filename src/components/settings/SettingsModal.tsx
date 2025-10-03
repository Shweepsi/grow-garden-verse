import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FontSizeSelector } from "@/components/accessibility/FontSizeSelector";
import { SoundSettings } from "@/components/settings/SoundSettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Paramètres</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6 overflow-y-auto flex-1 min-h-0">
          <SoundSettings />
          <Separator />
          <FontSizeSelector />
        </div>
      </DialogContent>
    </Dialog>
  );
};
