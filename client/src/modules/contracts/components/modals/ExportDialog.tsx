import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export default function ExportDialog({ open, onOpenChange }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ExportDialog</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-gray-600">
          TODO: implement Export options.
        </div>
      </DialogContent>
    </Dialog>
  );
}
