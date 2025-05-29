
"use client";

// This component is not currently used as the QMS document list is predefined.
// It's kept here in case a feature to add custom documents to a different list is needed later.

import type { QualitySystemDocument, QualityDocumentLevel } from "@/types"; // Updated types
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReactNode } from "react";

// Adjusted schema to align more with QualitySystemDocument - though this dialog is not currently used
const documentLevelsForDialog: QualityDocumentLevel[] = ['A', 'B', 'C', 'D1', 'D2'];

const addDocumentSchema = z.object({
  docId: z.string().min(3, { message: "Document ID must be at least 3 characters." }),
  title: z.string().min(3, { message: "Document title must be at least 3 characters." }),
  level: z.enum(documentLevelsForDialog, { required_error: "Please select a document level." }),
  relevantClauses: z.string().optional(),
  // Assuming docType would be inferred or set differently if this dialog was for the main QMS list
});

type AddDocumentFormValues = z.infer<typeof addDocumentSchema>;

interface AddDocumentDialogProps {
  children: ReactNode; 
  onAddDocument: (data: Omit<QualitySystemDocument, 'docType' | 'filePath'>) => void; // Simplified for now
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableLevels: { value: QualityDocumentLevel; label: string }[];
}

export function AddDocumentDialog({ children, onAddDocument, open, onOpenChange, availableLevels }: AddDocumentDialogProps) {
  const form = useForm<AddDocumentFormValues>({
    resolver: zodResolver(addDocumentSchema),
    defaultValues: {
      docId: "",
      title: "",
      relevantClauses: "",
    },
  });

  const onSubmit = (data: AddDocumentFormValues) => {
    // This needs further logic to map to QualitySystemDocument properly if used
    // For now, it's a simplified mapping
    onAddDocument({ 
      ...data,
      // docType and filePath would need to be handled
    });
    form.reset(); 
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Custom Document</DialogTitle>
          <DialogDescription>
            Fill in the details for the new document. (This form is not currently active for the main QMS list).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="docId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., CUS-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Custom Procedure for X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Document Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select document level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableLevels.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label} ({level.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="relevantClauses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relevant Clauses (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 7.5.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Add Document</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
