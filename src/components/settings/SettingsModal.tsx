import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FontSizeSelector } from "@/components/accessibility/FontSizeSelector";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Paramètres d'accessibilité</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <FontSizeSelector />
        </div>
      </DialogContent>
    </Dialog>
  );
};
