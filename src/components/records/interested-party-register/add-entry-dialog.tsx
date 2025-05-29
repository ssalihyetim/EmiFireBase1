
"use client";

import type { InterestedPartyRegisterEntryFirestore } from "@/types";
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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";

const INTERESTED_PARTY_COLLECTION_NAME = "interestedPartyRegister_FRM-420-001";

const addEntrySchema = z.object({
  partyType: z.string().min(1, "Party type is required."),
  partyName: z.string().min(1, "Party name is required."),
  needsAndExpectations: z.string().min(1, "Needs and expectations are required."),
  monitoringMethod: z.string().min(1, "Monitoring method is required."),
  reviewFrequency: z.string().min(1, "Review frequency is required."),
  lastReviewedDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type AddEntryFormValues = z.infer<typeof addEntrySchema>;

interface AddInterestedPartyRegisterEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryAdded: () => void;
}

export function AddInterestedPartyRegisterEntryDialog({ open, onOpenChange, onEntryAdded }: AddInterestedPartyRegisterEntryDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('InterestedPartyRegisterPage');
  const tCommon = useTranslations('Common');

  const form = useForm<AddEntryFormValues>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      partyType: "",
      partyName: "",
      needsAndExpectations: "",
      monitoringMethod: "",
      reviewFrequency: "",
      notes: "",
      lastReviewedDate: null,
    },
  });

  const onSubmit = async (values: AddEntryFormValues) => {
    const newEntryData: Omit<InterestedPartyRegisterEntryFirestore, 'id'> = {
      logDocId: 'FRM-420-001',
      partyType: values.partyType,
      partyName: values.partyName,
      needsAndExpectations: values.needsAndExpectations,
      monitoringMethod: values.monitoringMethod,
      reviewFrequency: values.reviewFrequency,
      lastReviewedDate: values.lastReviewedDate ? Timestamp.fromDate(values.lastReviewedDate) : null,
      notes: values.notes || "",
      createdAt: serverTimestamp() as Timestamp,
    };

    try {
      await addDoc(collection(db, INTERESTED_PARTY_COLLECTION_NAME), newEntryData);
      toast({
        title: t('toast_entryAdded_title'),
        description: t('toast_entryAdded_description', {partyName: values.partyName}),
      });
      onEntryAdded();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save interested party entry to Firestore:", error);
      toast({
        title: t('toast_errorAdding_title'),
        description: t('toast_errorAdding_description'),
        variant: "destructive",
      });
    }
  };
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('add_dialog_title')}</DialogTitle>
          <DialogDescription>{t('add_dialog_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="partyType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_partyType')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_partyType')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_partyName')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_partyName')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="needsAndExpectations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_needsAndExpectations')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('placeholder_needsAndExpectations')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="monitoringMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_monitoringMethod')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_monitoringMethod')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reviewFrequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_reviewFrequency')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_reviewFrequency')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastReviewedDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('label_lastReviewedDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value && isValid(field.value) ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>{tCommon('pick_a_date')}</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon('notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={`${tCommon('notes')}...`} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit">{tCommon('add')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    