
"use client";

import type { EquipmentMaintenanceLogEntryFirestore, MaintenanceType, MaintenanceStatus } from "@/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase"; 
import { collection, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";

const MAINTENANCE_LOG_COLLECTION_NAME = "maintenanceLog_FRM-712-001";

const maintenanceTypes: MaintenanceType[] = ['Preventive', 'Corrective', 'Calibration Check', 'Other'];
const maintenanceStatuses: MaintenanceStatus[] = ['Completed', 'Pending Parts', 'Scheduled'];

const addEntrySchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required."),
  equipmentName: z.string().min(1, "Equipment name is required."),
  maintenanceDate: z.date({ required_error: "Maintenance date is required." }),
  maintenanceType: z.enum(maintenanceTypes, { required_error: "Maintenance type is required." }),
  description: z.string().min(1, "Description of maintenance is required."),
  performedBy: z.string().min(1, "Performed by is required."),
  partsUsed: z.string().optional(),
  nextDueDate: z.date().optional().nullable(), 
  status: z.enum(maintenanceStatuses, { required_error: "Status is required." }),
  notes: z.string().optional(),
});

type AddEntryFormValues = z.infer<typeof addEntrySchema>;

interface AddMaintenanceLogEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryAdded: () => void;
}

export function AddMaintenanceLogEntryDialog({ open, onOpenChange, onEntryAdded }: AddMaintenanceLogEntryDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('EquipmentMaintenanceLogPage');
  const tCommon = useTranslations('Common');

  const maintenanceTypeOptions = [
    { value: 'Preventive', label: t('maintenance_type_preventive') },
    { value: 'Corrective', label: t('maintenance_type_corrective') },
    { value: 'Calibration Check', label: t('maintenance_type_calibration') },
    { value: 'Other', label: t('maintenance_type_other') },
  ];

  const maintenanceStatusOptions = [
    { value: 'Completed', label: t('maintenance_status_completed') },
    { value: 'Pending Parts', label: t('maintenance_status_pending_parts') },
    { value: 'Scheduled', label: t('maintenance_status_scheduled') },
  ];

  const form = useForm<AddEntryFormValues>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      equipmentId: "",
      equipmentName: "",
      maintenanceType: "Preventive",
      description: "",
      performedBy: "",
      partsUsed: "",
      status: "Completed",
      notes: "",
      maintenanceDate: new Date(),
      nextDueDate: null,
    },
  });

  const onSubmit = async (values: AddEntryFormValues) => {
    const currentEntryData: Omit<EquipmentMaintenanceLogEntryFirestore, 'id'> = {
      logDocId: 'FRM-712-001',
      equipmentId: values.equipmentId,
      equipmentName: values.equipmentName,
      maintenanceDate: Timestamp.fromDate(values.maintenanceDate),
      maintenanceType: values.maintenanceType,
      description: values.description,
      performedBy: values.performedBy,
      partsUsed: values.partsUsed || "",
      nextDueDate: values.nextDueDate ? Timestamp.fromDate(values.nextDueDate) : null,
      status: values.status,
      notes: values.notes || "",
      createdAt: serverTimestamp() as Timestamp,
    };

    let toastMessage = t('toast_entryAdded_description', { equipmentName: values.equipmentName });

    try {
      await addDoc(collection(db, MAINTENANCE_LOG_COLLECTION_NAME), currentEntryData);

      if (values.nextDueDate) {
        const scheduledEntryData: Omit<EquipmentMaintenanceLogEntryFirestore, 'id'> = {
          logDocId: 'FRM-712-001',
          equipmentId: values.equipmentId,
          equipmentName: values.equipmentName,
          maintenanceDate: Timestamp.fromDate(values.nextDueDate), 
          maintenanceType: 'Preventive' as MaintenanceType,
          description: `Scheduled Preventive Maintenance. (Refers to previous entry for ${format(values.maintenanceDate, "PP")})`,
          performedBy: "",
          partsUsed: "",
          nextDueDate: null,
          status: 'Scheduled' as MaintenanceStatus,
          notes: `Automatically scheduled. Original work on ${format(values.maintenanceDate, "PP")}: ${values.description}`,
          createdAt: serverTimestamp() as Timestamp,
        };
        await addDoc(collection(db, MAINTENANCE_LOG_COLLECTION_NAME), scheduledEntryData);
        toastMessage = t('toast_entryAdded_withFollowUp_description', { equipmentName: values.equipmentName, nextDueDate: format(values.nextDueDate, "PP") });
      }

      toast({
        title: t('toast_entryAdded_title'),
        description: toastMessage,
      });
      onEntryAdded(); 
      form.reset({ 
        equipmentId: "",
        equipmentName: "",
        maintenanceType: "Preventive",
        description: "",
        performedBy: "",
        partsUsed: "",
        status: "Completed",
        notes: "",
        maintenanceDate: new Date(),
        nextDueDate: null,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding document to Firestore: ", error);
      toast({
        title: t('toast_errorAdding_title'),
        description: t('toast_errorAdding_description'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
         form.reset({
            equipmentId: "",
            equipmentName: "",
            maintenanceType: "Preventive",
            description: "",
            performedBy: "",
            partsUsed: "",
            status: "Completed",
            notes: "",
            maintenanceDate: new Date(),
            nextDueDate: null,
          });
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('add_dialog_title')}</DialogTitle>
          <DialogDescription>{t('add_dialog_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="equipmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_equipmentId')}</FormLabel>
                    <FormControl><Input placeholder={t('placeholder_equipmentId')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="equipmentName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_equipmentName')}</FormLabel>
                    <FormControl><Input placeholder={t('placeholder_equipmentName')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="maintenanceDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('label_maintenanceDate')}</FormLabel>
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
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
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
              name="maintenanceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_maintenanceType')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholder_selectMaintenanceType')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenanceTypeOptions.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_description')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('placeholder_description')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="performedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_performedBy')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_performedBy')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="partsUsed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_partsUsed')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_partsUsed')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="nextDueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('label_nextDueDate')}</FormLabel>
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
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_status')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('placeholder_selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {maintenanceStatusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_notes')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('placeholder_notes')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                 form.reset({
                    equipmentId: "",
                    equipmentName: "",
                    maintenanceType: "Preventive",
                    description: "",
                    performedBy: "",
                    partsUsed: "",
                    status: "Completed",
                    notes: "",
                    maintenanceDate: new Date(),
                    nextDueDate: null,
                  }); 
                onOpenChange(false);
                }}>
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

    