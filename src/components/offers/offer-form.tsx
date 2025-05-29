
"use client";

import type { Offer, OfferItem, Attachment } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Trash2, Save, Upload, Paperclip, ChevronsUpDown } from "lucide-react"; 
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { storage } from "@/lib/firebase";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { manufacturingProcesses } from "@/config/processes";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

const attachmentSchema = z.object({
  name: z.string().min(1, "Attachment name is required"),
  url: z.string().url("Invalid URL format"),
  type: z.string().optional(),
  size: z.number().optional(),
  uploadedAt: z.string().optional(), // ISO date string
});

const offerItemFormSchema = z.object({
  id: z.string().optional(),
  partName: z.string().min(1, "Part name is required"),
  rawMaterialType: z.string().optional().default(''),
  rawMaterialDimension: z.string().optional().default(''),
  materialCost: z.coerce.number().min(0).default(0),
  machiningCost: z.coerce.number().min(0).default(0),
  outsourcedProcessesCost: z.coerce.number().min(0).default(0),
  unitPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1").default(1),
  totalPrice: z.coerce.number().min(0).default(0),
  assignedProcesses: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export type OfferFormInputValues = z.infer<typeof offerItemFormSchema>; // More accurately, this is for items

const offerFormValidationSchema = z.object({
  id: z.string().optional(),
  offerNumber: z.string().min(1, "Offer number is required"),
  clientName: z.string().min(1, "Client name is required"),
  currency: z.enum(["EUR", "USD", "GBP"], { required_error: "Currency is required" }),
  vatRate: z.coerce.number().min(0).max(100).default(19),
  notes: z.string().optional().default(""),
  items: z.array(offerItemFormSchema).min(1, "At least one item is required"),
  subtotal: z.coerce.number().default(0),
  vatAmount: z.coerce.number().default(0),
  grandTotal: z.coerce.number().default(0),
  status: z.enum(["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Archived"]).default("Draft"),
  createdDate: z.string().optional(), // Kept as string for form state
  lastUpdated: z.string().optional(), // Kept as string for form state
});

export type OfferFormValues = z.infer<typeof offerFormValidationSchema>;


interface OfferFormProps {
  initialData?: OfferFormValues;
  onSubmit: (data: OfferFormValues) => void;
  isEditing?: boolean;
}

const currencyOptions: Offer["currency"][] = ["EUR", "USD", "GBP"];

export function OfferForm({ initialData, onSubmit, isEditing = false }: OfferFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedFilesPerItem, setSelectedFilesPerItem] = useState<Record<number, File[]>>({});
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [manuallyEditedPrices, setManuallyEditedPrices] = useState<Record<number, { unitPrice?: boolean; totalPrice?: boolean }>>({});
  const [processPopoversOpen, setProcessPopoversOpen] = useState<Record<number, boolean>>({});
  const t = useTranslations('OfferForm');

  const form = useForm<OfferFormValues>({
    resolver: zodResolver(offerFormValidationSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          items: initialData.items?.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            assignedProcesses: Array.isArray(item.assignedProcesses) ? item.assignedProcesses : [],
            attachments: Array.isArray(item.attachments) ? item.attachments : [],
            materialCost: item.materialCost || 0,
            machiningCost: item.machiningCost || 0,
            outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 1,
            totalPrice: item.totalPrice || 0,
          })) || [],
           subtotal: initialData.subtotal || 0,
           vatAmount: initialData.vatAmount || 0,
           grandTotal: initialData.grandTotal || 0,
           status: initialData.status || "Draft",
           createdDate: initialData.createdDate, // Expecting ISO string
           lastUpdated: initialData.lastUpdated, // Expecting ISO string
        }
      : {
          offerNumber: `OFF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
          clientName: "",
          currency: "EUR",
          vatRate: 19,
          notes: "",
          items: [{
            id: `item-${Date.now()}`, partName: "", rawMaterialType: "", rawMaterialDimension: "",
            materialCost: 0, machiningCost: 0, outsourcedProcessesCost: 0,
            unitPrice: 0, quantity: 1, totalPrice: 0, assignedProcesses: [], attachments: []
          }],
          status: "Draft",
          subtotal: 0, vatAmount: 0, grandTotal: 0,
          createdDate: undefined,
          lastUpdated: undefined,
        },
    mode: "onChange",
  });

  const { control, register, handleSubmit, formState: { errors }, watch, setValue, getValues } = form;

  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "items",
  });

  const watchedItems = watch("items");
  const watchedVatRate = watch("vatRate");
  const watchedCurrency = watch("currency");

  useEffect(() => {
    if (Array.isArray(watchedItems)) {
      watchedItems.forEach((item, index) => {
        const materialCost = Number(item.materialCost) || 0;
        const machiningCost = Number(item.machiningCost) || 0;
        const outsourcedProcessesCost = Number(item.outsourcedProcessesCost) || 0;
        const quantity = Number(item.quantity) || 1;
  
        const calculatedUnitPrice = materialCost + machiningCost + outsourcedProcessesCost;
        
        if (!manuallyEditedPrices[index]?.unitPrice) {
          if (Number(item.unitPrice) !== calculatedUnitPrice) {
            setValue(`items.${index}.unitPrice`, calculatedUnitPrice, { shouldDirty: true });
          }
        }
  
        const currentUnitPrice = Number(getValues(`items.${index}.unitPrice`)) || 0; // Use getValues for most current
        const calculatedTotalPrice = currentUnitPrice * quantity;
        
        if (!manuallyEditedPrices[index]?.totalPrice || !manuallyEditedPrices[index]?.unitPrice) { // Also recalculate if unit price was auto-updated
          if (Number(item.totalPrice) !== calculatedTotalPrice) {
            setValue(`items.${index}.totalPrice`, calculatedTotalPrice, { shouldDirty: true });
          }
        }
      });
    }
  }, [watchedItems, setValue, getValues, manuallyEditedPrices]);


  useEffect(() => {
    const itemsToSum = Array.isArray(watchedItems) ? watchedItems : [];
    const currentVatRate = Number(watchedVatRate) || 0;

    const calculatedSubtotal = itemsToSum.reduce((sum, item) => sum + (Number(item.totalPrice) || 0), 0);
    const calculatedVatAmount = calculatedSubtotal * (currentVatRate / 100);
    const calculatedGrandTotal = calculatedSubtotal + calculatedVatAmount;

    if (Number(getValues('subtotal')) !== calculatedSubtotal) setValue('subtotal', calculatedSubtotal, { shouldDirty: true });
    if (Number(getValues('vatAmount')) !== calculatedVatAmount) setValue('vatAmount', calculatedVatAmount, { shouldDirty: true });
    if (Number(getValues('grandTotal')) !== calculatedGrandTotal) setValue('grandTotal', calculatedGrandTotal, { shouldDirty: true });
  }, [watchedItems, watchedVatRate, setValue, getValues]);


  const watchedSubtotal = watch("subtotal");
  const watchedVatAmount = watch("vatAmount");
  const watchedGrandTotal = watch("grandTotal");

  const handleFileSelectionChange = (event: React.ChangeEvent<HTMLInputElement>, itemIndex: number) => {
    if (event.target.files) {
      setSelectedFilesPerItem(prev => ({
        ...prev,
        [itemIndex]: Array.from(event.target.files || [])
      }));
    }
  };

  const handleFileUpload = async (file: File, itemIndex: number) => {
    if (!file) {
      toast({ title: t('toast_noFileSelected'), variant: "destructive" });
      return;
    }
    
    let offerIdForPath = getValues("id");
    if (!offerIdForPath && initialData?.id) {
        offerIdForPath = initialData.id;
    } else if (!offerIdForPath) {
        offerIdForPath = getValues("offerNumber") || `temp_offer_${Date.now()}`;
    }
    
    const itemId = getValues(`items.${itemIndex}.id`) || `item_${Date.now()}_${itemIndex}`;
    const filePath = `attachments/offers/${offerIdForPath}/${itemId}/${file.name}`;
    const fileRef = storageRef(storage, filePath);

    toast({ title: t('toast_uploadingFile'), description: file.name });

    try {
      const uploadResult = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      const newAttachment: Attachment = {
        name: file.name,
        url: downloadURL,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };

      const currentAttachments = getValues(`items.${itemIndex}.attachments`) || [];
      setValue(`items.${itemIndex}.attachments`, [...currentAttachments, newAttachment], { shouldDirty: true });

      toast({ title: t('toast_fileUploadedSuccess_title'), description: file.name, variant: "default" });
      
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: t('toast_fileUploadFailed_title'), description: `${file.name}: ${(error as Error).message}`, variant: "destructive" });
    }
  };

  const handleUploadSelectedFiles = async (itemIndex: number) => {
    const filesToUpload = selectedFilesPerItem[itemIndex];
    if (!filesToUpload || filesToUpload.length === 0) {
      toast({ title: t('toast_noFilesSelectedForUpload'), variant: "destructive" });
      return;
    }

    for (const file of filesToUpload) {
      await handleFileUpload(file, itemIndex); 
    }

    setSelectedFilesPerItem(prev => {
      const newState = { ...prev };
      delete newState[itemIndex];
      return newState;
    });
    
    const currentFileInputRef = fileInputRefs.current[itemIndex];
    if (currentFileInputRef) {
        currentFileInputRef.value = "";
    }
  };
  
  const handleComponentCostChange = (index: number) => {
    setManuallyEditedPrices(prev => ({
      ...prev,
      [index]: { unitPrice: false, totalPrice: false }
    }));
  };

  const handleQuantityChange = (index: number) => {
     setManuallyEditedPrices(prev => ({
      ...prev,
      [index]: { ...prev[index], totalPrice: false } // Allow total price to recalculate
    }));
  };
  
  const handleUnitPriceChange = (index: number, valueStr: string) => {
    const value = Number(valueStr) || 0;
    setValue(`items.${index}.unitPrice`, value, { shouldDirty: true });
    
    const quantity = Number(getValues(`items.${index}.quantity`)) || 1;
    setValue(`items.${index}.totalPrice`, value * quantity, { shouldDirty: true });
    
    setManuallyEditedPrices(prev => ({
      ...prev,
      [index]: { unitPrice: true, totalPrice: false } 
    }));
  };

  const handleTotalPriceChange = (index: number, valueStr: string) => {
    const value = Number(valueStr) || 0;
    setValue(`items.${index}.totalPrice`, value, { shouldDirty: true });
    
    const quantity = Number(getValues(`items.${index}.quantity`)) || 1;
    if (quantity > 0) {
      setValue(`items.${index}.unitPrice`, value / quantity, { shouldDirty: true });
    }
    
    setManuallyEditedPrices(prev => ({
      ...prev,
      [index]: { totalPrice: true, unitPrice: false } 
    }));
  };


  const handleFormSubmit = (formDataFromHook: OfferFormValues) => {
    try {
      onSubmit(formDataFromHook);
    } catch (error) {
      console.error("Error transforming/submitting offer data:", error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        toast({
            title: t('error_zod_validation', { errors: "" }), // Keep main part, specific errors in console
            description: errorMessages,
            variant: "destructive"
        })
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? t('title_edit', {offerNumber: initialData?.offerNumber || ''}) : t('title_create')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="offerNumber">{t('label_offerNumber')}</Label>
              <Input id="offerNumber" {...register("offerNumber")} readOnly={isEditing && !!initialData?.offerNumber} />
              {errors.offerNumber && <p className="text-sm text-destructive mt-1">{errors.offerNumber.message}</p>}
            </div>
            <div>
              <Label htmlFor="clientName">{t('label_clientName')}</Label>
              <Input id="clientName" {...register("clientName")} />
              {errors.clientName && <p className="text-sm text-destructive mt-1">{errors.clientName.message}</p>}
            </div>
            <div>
              <Label htmlFor="currency">{t('label_currency')}</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="currency"><SelectValue placeholder={t('placeholder_selectCurrency')} /></SelectTrigger>
                    <SelectContent>{currencyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              />
              {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('header_items')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">{t('table_partName')}</TableHead>
                  <TableHead className="min-w-[150px]">{t('table_rawMaterialType')}</TableHead>
                  <TableHead className="min-w-[150px]">{t('table_rawMaterialDimension')}</TableHead>
                  <TableHead className="min-w-[110px] text-right">{t('table_materialCost')}</TableHead>
                  <TableHead className="min-w-[120px] text-right">{t('table_machiningCost')}</TableHead>
                  <TableHead className="min-w-[160px] text-right">{t('table_outsourcedProcessesCost')}</TableHead>
                  <TableHead className="min-w-[120px] text-right">{t('table_unitPrice')}</TableHead>
                  <TableHead className="min-w-[80px] text-right">{t('table_qty')}</TableHead>
                  <TableHead className="min-w-[120px] text-right">{t('table_totalPrice')}</TableHead>
                  <TableHead className="min-w-[200px]">{t('table_assignedProcesses')}</TableHead>
                  <TableHead className="min-w-[250px]">{t('table_attachments')}</TableHead>
                  <TableHead className="w-[50px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell><Input {...register(`items.${index}.partName`)} placeholder={t('placeholder_partName')} className="w-full" /></TableCell>
                    <TableCell><Input {...register(`items.${index}.rawMaterialType`)} placeholder={t('placeholder_rawMaterialType')} className="w-full" /></TableCell>
                    <TableCell><Input {...register(`items.${index}.rawMaterialDimension`)} placeholder={t('placeholder_rawMaterialDimension')} className="w-full" /></TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="any" {...register(`items.${index}.materialCost`)} 
                        placeholder={t('placeholder_cost')} className="w-full text-right"
                        onChange={(e) => {
                          register(`items.${index}.materialCost`).onChange(e);
                          handleComponentCostChange(index);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" step="any" {...register(`items.${index}.machiningCost`)} 
                        placeholder={t('placeholder_cost')} className="w-full text-right"
                        onChange={(e) => {
                          register(`items.${index}.machiningCost`).onChange(e);
                          handleComponentCostChange(index);
                        }}
                      />
                    </TableCell>
                     <TableCell>
                      <Input 
                        type="number" step="any" {...register(`items.${index}.outsourcedProcessesCost`)} 
                        placeholder={t('placeholder_cost')} className="w-full text-right"
                        onChange={(e) => {
                          register(`items.${index}.outsourcedProcessesCost`).onChange(e);
                          handleComponentCostChange(index);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="any" 
                        value={watchedItems?.[index]?.unitPrice || 0}
                        onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                        className="w-full text-right" 
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="1" 
                        min="1" 
                        {...register(`items.${index}.quantity`)} 
                        placeholder={t('placeholder_qty')} 
                        className="w-24 text-right" 
                        onChange={(e) => {
                           register(`items.${index}.quantity`).onChange(e);
                           handleQuantityChange(index);
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number" 
                        step="any" 
                        value={watchedItems?.[index]?.totalPrice || 0}
                        onChange={(e) => handleTotalPriceChange(index, e.target.value)}
                        className="w-full text-right" 
                      />
                    </TableCell>
                    <TableCell>
                      <Controller
                        control={control}
                        name={`items.${index}.assignedProcesses`}
                        render={({ field: controllerField }) => ( // Renamed field to avoid conflict
                          <Popover open={processPopoversOpen[index]} onOpenChange={(isOpen) => setProcessPopoversOpen(prev => ({...prev, [index]: isOpen}))}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={processPopoversOpen[index]}
                                className="w-full justify-between text-xs h-9"
                              >
                                {controllerField.value && controllerField.value.length > 0
                                  ? controllerField.value.length === 1 
                                    ? controllerField.value[0]
                                    : `${controllerField.value.length} ${t('placeholder_selectProcesses').toLowerCase()}`
                                  : t('placeholder_selectProcesses')}
                                <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0">
                              <Command>
                                <CommandInput placeholder={t('command_searchProcess')} className="h-8 text-xs" />
                                <CommandList>
                                  <CommandEmpty>{t('command_noProcessFound')}</CommandEmpty>
                                  <CommandGroup>
                                    {manufacturingProcesses.map((processName) => {
                                      const isSelected = controllerField.value?.includes(processName);
                                      return (
                                        <CommandItem
                                          key={processName}
                                          value={processName}
                                          onSelect={() => {
                                            const currentSelection = controllerField.value || [];
                                            const newSelection = isSelected
                                              ? currentSelection.filter(p => p !== processName)
                                              : [...currentSelection, processName];
                                            controllerField.onChange(newSelection);
                                          }}
                                          className="text-xs"
                                        >
                                          <Checkbox
                                            checked={isSelected}
                                            className="mr-2 h-3 w-3"
                                          />
                                          {processName}
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {Array.isArray(watchedItems?.[index]?.attachments) && watchedItems[index].attachments.map((att, attIndex) => (
                          <div key={attIndex} className="flex items-center text-xs gap-1 py-0.5">
                            <Paperclip className="h-3 w-3 flex-shrink-0" />
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" title={att.name}>
                              {att.name}
                            </a>
                          </div>
                        ))}
                         <Input
                          type="file"
                          multiple
                          ref={(el) => { fileInputRefs.current[index] = el; }}
                          className="text-xs p-1 h-8 flex-grow mt-1"
                          onChange={(e) => handleFileSelectionChange(e, index)}
                        />
                        {selectedFilesPerItem[index] && selectedFilesPerItem[index].length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground max-h-20 overflow-y-auto">
                            <p className="font-medium text-foreground">{t('label_selectedFiles', { count: selectedFilesPerItem[index].length })}</p>
                            <ul className="list-disc pl-4">
                              {selectedFilesPerItem[index].map((file, i) => (
                                <li key={i} className="truncate" title={file.name}>{file.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUploadSelectedFiles(index)}
                          className="px-2 h-8 mt-1 text-xs"
                          disabled={!selectedFilesPerItem[index] || selectedFilesPerItem[index].length === 0}
                        >
                          <Upload className="h-3 w-3 mr-1"/> {t('button_uploadSelected')}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {errors.items && typeof errors.items === 'object' && !Array.isArray(errors.items) && (errors.items as { message?: string }).message && <p className="text-sm text-destructive mt-1">{(errors.items as { message?: string }).message}</p>}
          {Array.isArray(errors.items) && errors.items.map((itemError, i) => (
             itemError && typeof itemError === 'object' && Object.entries(itemError).map(([key, fieldErrorObj]) => {
                const fieldError = fieldErrorObj as { message?: string };
                return fieldError?.message ? <p key={`${i}-${key}-${fieldError.message}`} className="text-sm text-destructive mt-1">Item {i+1} ({key}): {fieldError.message}</p> : null;
              }).filter(Boolean)
          ))}
          <Button type="button" variant="outline" onClick={() => append({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, partName: "", rawMaterialType: "", rawMaterialDimension: "",
            materialCost: 0, machiningCost: 0, outsourcedProcessesCost: 0,
            unitPrice: 0, quantity: 1, totalPrice: 0, assignedProcesses: [], attachments: []
          })} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('button_addItem')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t('header_summaryAndNotes')}</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="notes">{t('label_notes')}</Label>
              <Textarea id="notes" {...register("notes")} placeholder={t('placeholder_notes')} rows={4} />
            </div>
            <div className="space-y-2">
              <div>
                <Label htmlFor="vatRate">{t('label_vatRate')}</Label>
                <Input id="vatRate" type="number" step="any" {...register("vatRate")} className="max-w-[100px]" />
                {errors.vatRate && <p className="text-sm text-destructive mt-1">{errors.vatRate.message}</p>}
              </div>
              <div className="text-right space-y-1 pt-2 border-t mt-4">
                <p>{t('summary_subtotal')} <span className="font-semibold">{watchedCurrency} { (Number(watchedSubtotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                <p>{t('summary_vat', {vatRate: Number(watchedVatRate) || 0})} <span className="font-semibold">{watchedCurrency} { (Number(watchedVatAmount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                <p className="text-lg font-bold">{t('summary_grandTotal')} <span className="font-semibold">{watchedCurrency} { (Number(watchedGrandTotal) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
              </div>
            </div>
          </div>
          {isEditing && (
            <div className="pt-4">
              <Label htmlFor="status">{t('label_offerStatus')}</Label>
              <Controller name="status" control={control} render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger id="status"><SelectValue placeholder={t('placeholder_selectStatus')} /></SelectTrigger>
                  <SelectContent>{(["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Archived"] as OfferFormValues['status'][]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              )} />
              {errors.status && <p className="text-sm text-destructive mt-1">{errors.status.message}</p>}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>{t('button_cancel')}</Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" /> {isEditing ? t('button_saveChanges') : t('button_createOffer')}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

    