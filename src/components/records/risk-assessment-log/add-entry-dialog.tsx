
"use client";

import type { RiskAssessmentLogEntryFirestore, RiskLikelihood, RiskSeverity, RiskLevel, RiskActionStatus } from "@/types";
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

const RISK_ASSESSMENT_COLLECTION_NAME = "riskAssessmentLog_FRM-612-001";

const likelihoodOptions: RiskLikelihood[] = ['Low', 'Medium', 'High'];
const severityOptions: RiskSeverity[] = ['Low', 'Medium', 'High'];
const riskLevelOptions: RiskLevel[] = ['Low', 'Medium', 'High'];
const actionStatusOptions: RiskActionStatus[] = ['Open', 'In Progress', 'Completed', 'Closed'];

const addEntrySchema = z.object({
  riskIdentificationDate: z.date({ required_error: "Risk identification date is required." }),
  riskSource: z.string().min(1, "Risk source is required."),
  riskDescription: z.string().min(1, "Risk description is required."),
  potentialImpact: z.string().min(1, "Potential impact is required."),
  likelihood: z.enum(likelihoodOptions, { required_error: "Likelihood is required." }),
  severity: z.enum(severityOptions, { required_error: "Severity is required." }),
  riskLevel: z.enum(riskLevelOptions, { required_error: "Risk level assessment is required." }),
  mitigationActions: z.string().min(1, "Mitigation actions are required."),
  responsiblePerson: z.string().min(1, "Responsible person is required."),
  actionStatus: z.enum(actionStatusOptions, { required_error: "Action status is required." }),
  completionTargetDate: z.date().optional().nullable(),
  effectivenessReviewDate: z.date().optional().nullable(),
  notes: z.string().optional(),
});

type AddEntryFormValues = z.infer<typeof addEntrySchema>;

interface AddRiskAssessmentLogEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEntryAdded: () => void;
}

export function AddRiskAssessmentLogEntryDialog({ open, onOpenChange, onEntryAdded }: AddRiskAssessmentLogEntryDialogProps) {
  const { toast } = useToast();
  const t = useTranslations('RiskAssessmentLogPage');
  const tCommon = useTranslations('Common');

  const translatedLikelihoodOptions = likelihoodOptions.map(o => ({ value: o, label: t(`risk_likelihood_${o.toLowerCase()}`) }));
  const translatedSeverityOptions = severityOptions.map(o => ({ value: o, label: t(`risk_severity_${o.toLowerCase()}`) }));
  const translatedRiskLevelOptions = riskLevelOptions.map(o => ({ value: o, label: t(`risk_level_${o.toLowerCase()}`) }));
  const translatedActionStatusOptions = actionStatusOptions.map(o => ({ value: o, label: t(`risk_action_status_${o.toLowerCase().replace(' ', '_')}`) }));


  const form = useForm<AddEntryFormValues>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      riskIdentificationDate: new Date(),
      riskSource: "",
      riskDescription: "",
      potentialImpact: "",
      likelihood: "Medium",
      severity: "Medium",
      riskLevel: "Medium",
      mitigationActions: "",
      responsiblePerson: "",
      actionStatus: "Open",
      notes: "",
      completionTargetDate: null,
      effectivenessReviewDate: null,
    },
  });

  const onSubmit = async (values: AddEntryFormValues) => {
    const newEntryData: Omit<RiskAssessmentLogEntryFirestore, 'id'> = {
      logDocId: 'FRM-612-001',
      riskIdentificationDate: Timestamp.fromDate(values.riskIdentificationDate),
      riskSource: values.riskSource,
      riskDescription: values.riskDescription,
      potentialImpact: values.potentialImpact,
      likelihood: values.likelihood,
      severity: values.severity,
      riskLevel: values.riskLevel,
      mitigationActions: values.mitigationActions,
      responsiblePerson: values.responsiblePerson,
      actionStatus: values.actionStatus,
      completionTargetDate: values.completionTargetDate ? Timestamp.fromDate(values.completionTargetDate) : null,
      effectivenessReviewDate: values.effectivenessReviewDate ? Timestamp.fromDate(values.effectivenessReviewDate) : null,
      notes: values.notes || "",
      createdAt: serverTimestamp() as Timestamp,
    };

    try {
      await addDoc(collection(db, RISK_ASSESSMENT_COLLECTION_NAME), newEntryData);
      toast({
        title: t('toast_entryAdded_title'),
        description: t('toast_entryAdded_description', {description: newEntryData.riskDescription.substring(0,30)}),
      });
      onEntryAdded();
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save risk assessment entry to Firestore:", error);
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('add_dialog_title')}</DialogTitle>
          <DialogDescription>{t('add_dialog_description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 py-2 max-h-[75vh] overflow-y-auto pr-2">
            <FormField
              control={form.control}
              name="riskIdentificationDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{t('label_riskIdentificationDate')}</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>{tCommon('pick_a_date')}</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="riskSource"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_riskSource')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_riskSource')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="riskDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_riskDescription')}</FormLabel>
                  <FormControl><Textarea placeholder={t('placeholder_riskDescription')} {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="potentialImpact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_potentialImpact')}</FormLabel>
                  <FormControl><Input placeholder={t('placeholder_potentialImpact')} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="likelihood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_likelihood')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('placeholder_selectLikelihood')} /></SelectTrigger></FormControl>
                      <SelectContent>{translatedLikelihoodOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="severity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_severity')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('placeholder_selectSeverity')} /></SelectTrigger></FormControl>
                      <SelectContent>{translatedSeverityOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="riskLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_riskLevel')}</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('placeholder_assessRiskLevel')} /></SelectTrigger></FormControl>
                      <SelectContent>{translatedRiskLevelOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="mitigationActions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('label_mitigationActions')}</FormLabel>
                  <FormControl><Textarea placeholder={t('placeholder_mitigationActions')} {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="responsiblePerson"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_responsiblePerson')}</FormLabel>
                    <FormControl><Input placeholder={t('placeholder_responsiblePerson')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="actionStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('label_actionStatus')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t('placeholder_selectActionStatus')} /></SelectTrigger></FormControl>
                      <SelectContent>{translatedActionStatusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="completionTargetDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('label_completionTargetDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>{tCommon('pick_a_date')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectivenessReviewDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('label_effectivenessReviewDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>
                            {field.value && isValid(field.value) ? format(field.value, "PPP") : <span>{tCommon('pick_a_date')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon('notes')}</FormLabel>
                  <FormControl><Textarea placeholder={`${tCommon('notes')}...`} {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>{tCommon('cancel')}</Button>
              <Button type="submit">{tCommon('add')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    