
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/navigation'; 
import { PageHeader } from "@/components/page-header";
import { OfferForm, type OfferFormValues } from "@/components/offers/offer-form";
import { useToast } from "@/hooks/use-toast";
import type { Offer, OfferFirestoreData } from "@/types";
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

const OFFERS_COLLECTION_NAME = "offers";

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams(); 
  const { toast } = useToast();
  const [offer, setOffer] = useState<Offer | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const offerId = params?.id as string;
  const t = useTranslations('EditOfferPage'); 
  const tCommon = useTranslations('Common');

  const fetchOffer = useCallback(async () => {
    if (!offerId) {
      setIsLoading(false);
      setOffer(null); 
      return;
    }
    setIsLoading(true);
    try {
      const offerRef = doc(db, OFFERS_COLLECTION_NAME, offerId);
      const docSnap = await getDoc(offerRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as OfferFirestoreData;
        if (!(data.createdDate instanceof Timestamp) || !(data.lastUpdated instanceof Timestamp)) {
          console.error("Fetched offer data has invalid date types", data);
          setOffer(null);
          toast({
            title: tCommon('error'),
            description: t('error_fetch_invalid_date'),
            variant: "destructive",
          });
          return;
        }
        setOffer({
          ...data,
          id: docSnap.id,
          createdDate: (data.createdDate as Timestamp).toDate().toISOString(),
          lastUpdated: (data.lastUpdated as Timestamp).toDate().toISOString(),
          items: data.items.map(item => ({ // Ensure items are correctly mapped
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            materialCost: item.materialCost || 0,
            machiningCost: item.machiningCost || 0,
            outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 1,
            totalPrice: item.totalPrice || 0,
            assignedProcesses: Array.isArray(item.assignedProcesses) ? item.assignedProcesses : [],
            attachments: Array.isArray(item.attachments) ? item.attachments.map(att => ({
              name: att.name || '',
              url: att.url || '',
              type: att.type || '',
              size: att.size || 0,
              uploadedAt: att.uploadedAt || new Date().toISOString()
            })) : [],
          })),
        });
      } else {
        setOffer(null);
        toast({
          title: t('offer_not_found_title'),
          description: t('error_fetch_not_found'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load offer from Firestore:", error);
      setOffer(null); 
      toast({
        title: tCommon('error'),
        description: `${t('error_fetch_general')} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [offerId, toast, t, tCommon]);

  useEffect(() => {
    fetchOffer();
  }, [fetchOffer]);

  const handleUpdateOffer = async (formDataFromForm: OfferFormValues) => {
    if (!offer) { 
      toast({ title: tCommon('error'), description: t('error_updating_offer_toast_description'), variant: "destructive" });
      return;
    }

    try {
      const offerRef = doc(db, OFFERS_COLLECTION_NAME, offer.id);
      
      // Exclude form-specific fields like 'id' which should not be updated in Firestore document data itself
      // createdDate should also be preserved from original offer, not from form if it was editable
      const { id: formId, createdDate: formCreatedDate, ...restOfFormData } = formDataFromForm;

      const dataToUpdate: Partial<Omit<OfferFirestoreData, 'id' | 'createdDate'>> = {
        ...restOfFormData,
        lastUpdated: serverTimestamp() as Timestamp, 
        // Ensure items are correctly structured
        items: restOfFormData.items.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            materialCost: Number(item.materialCost) || 0,
            machiningCost: Number(item.machiningCost) || 0,
            outsourcedProcessesCost: Number(item.outsourcedProcessesCost) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            quantity: Number(item.quantity) || 1,
            totalPrice: Number(item.totalPrice) || 0,
            assignedProcesses: Array.isArray(item.assignedProcesses) ? item.assignedProcesses : [],
            attachments: Array.isArray(item.attachments) ? item.attachments.map(att => ({
                name: att.name || '',
                url: att.url || '',
                type: att.type || '',
                size: Number(att.size) || 0,
                uploadedAt: att.uploadedAt || new Date().toISOString()
            })) : [],
        })),
      };
      
      await updateDoc(offerRef, dataToUpdate);

      toast({
        title: t('offer_updated_toast_title'),
        description: t('offer_updated_toast_description', { offerNumber: formDataFromForm.offerNumber }),
        variant: "default",
      });
      router.push("/offers");
    } catch (error) {
      console.error("Failed to update offer in Firestore:", error);
      toast({
        title: t('error_updating_offer_toast_title'),
        description: `${t('error_updating_offer_toast_description')} ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  };

  if (isLoading || offer === undefined) { 
    return (
      <div>
        <PageHeader title={t('loading_offer_title')} />
        <div className="space-y-4 p-6">
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">{t('loading_offer_description')}</p>
          </div>
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!offer) { 
    return (
      <div>
        <PageHeader title={t('offer_not_found_title')} description={t('offer_not_found_description')} />
        <div className="p-6">
          <Button onClick={() => router.push('/offers')}>{t('button_backToOffers')}</Button>
        </div>
      </div>
    );
  }
  
  const initialFormData: OfferFormValues = {
    ...offer,
    createdDate: offer.createdDate, // This is already an ISO string
    lastUpdated: offer.lastUpdated, // This is already an ISO string
    items: offer.items.map(item => ({
        ...item,
        rawMaterialType: item.rawMaterialType || '',
        rawMaterialDimension: item.rawMaterialDimension || '',
        assignedProcesses: Array.isArray(item.assignedProcesses) ? item.assignedProcesses : [], 
        attachments: Array.isArray(item.attachments) ? item.attachments.map(att => ({
            name: att.name || '',
            url: att.url || '',
            type: att.type || '',
            size: Number(att.size) || 0,
            uploadedAt: att.uploadedAt || new Date().toISOString()
        })) : [],
        materialCost: item.materialCost || 0,
        machiningCost: item.machiningCost || 0,
        outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
        unitPrice: item.unitPrice || 0,
        quantity: item.quantity || 1,
        totalPrice: item.totalPrice || 0,
    }))
  };

  return (
    <div>
      <PageHeader
        title={t('page_title_prefix') + ` ${offer.offerNumber}`}
        description={t('page_description')}
      />
      <OfferForm 
        initialData={initialFormData} 
        onSubmit={handleUpdateOffer} 
        isEditing={true} 
      />
    </div>
  );
}

    