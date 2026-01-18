import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { FontSizeSelector } from "@/components/accessibility/FontSizeSelector";
import { GridLayoutSelector } from "@/components/settings/GridLayoutSelector";
import { SoundSettings } from "@/components/settings/SoundSettings";
import { APP_VERSION } from "@/version";

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
          <GridLayoutSelector />
          <Separator />
          <FontSizeSelector />
          <div className="pt-4 text-center">
            <span className="text-xs text-muted-foreground">
              Version {APP_VERSION}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
