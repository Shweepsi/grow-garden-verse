import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FontSizeSelector } from "@/components/accessibility/FontSizeSelector";
import { AdSystemDiagnostics } from "@/components/ads/AdSystemDiagnostics";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Paramètres d'accessibilité</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-6 overflow-y-auto flex-1 min-h-0">
          <FontSizeSelector />
          <AdSystemDiagnostics />
        </div>
      </DialogContent>
    </Dialog>
  );
};
