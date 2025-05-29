
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
// Use next-intl's Link for locale-aware navigation
import { Link, useRouter } from '@/navigation';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Eye, Edit, Trash2, Flag, FileDown, Loader2 } from "lucide-react";
import type { Offer, OfferStatus, OfferFirestoreData, OfferItem, Attachment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { OfferPDFDocument } from "@/components/offers/offer-pdf-document";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, Timestamp, query, orderBy, serverTimestamp, writeBatch } from "firebase/firestore";
import { useTranslations } from 'next-intl';

const OFFERS_COLLECTION_NAME = "offers";
const ORDERS_COLLECTION_NAME = "orders";

const availableOfferStatuses: OfferStatus[] = ["Draft", "Sent", "Under Review", "Accepted", "Rejected", "Archived"];

const sampleOfferItems1: OfferItem[] = [
  {
    id: "item1-1", partName: "Custom Flange XF-100", rawMaterialType: "Aluminum 6061-T6", rawMaterialDimension: "Bar Dia 50mm x 100mm",
    materialCost: 50, machiningCost: 120, outsourcedProcessesCost: 30, unitPrice: 200, quantity: 10, totalPrice: 2000,
    assignedProcesses: ["Turning", "Deburring"], attachments: [{ name: "flange_drawing_rev2.pdf", url: "#", type: "pdf", size: 12345, uploadedAt: new Date().toISOString() }]
  },
  {
    id: "item1-2", partName: "Mounting Plate MP-25", rawMaterialType: "Stainless Steel 304", rawMaterialDimension: "Sheet 5mm x 200mm x 150mm",
    materialCost: 30, machiningCost: 80, outsourcedProcessesCost: 15, unitPrice: 125, quantity: 25, totalPrice: 3125,
    assignedProcesses: ["3-Axis Milling", "Anodizing"], attachments: [{ name: "plate_spec_v1.docx", url: "#", type: "docx", size: 5678, uploadedAt: new Date().toISOString() }]
  }
];

const sampleOfferSeed1: Omit<OfferFirestoreData, 'id' | 'createdDate' | 'lastUpdated'> = {
  offerNumber: `OFF-${new Date().getFullYear()}-S001`,
  clientName: "Precision Parts Co.",
  status: "Sent",
  currency: "USD",
  vatRate: 10,
  items: sampleOfferItems1.map(item => ({
      ...item,
      rawMaterialType: item.rawMaterialType || '',
      rawMaterialDimension: item.rawMaterialDimension || '',
      materialCost: item.materialCost || 0,
      machiningCost: item.machiningCost || 0,
      outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
      unitPrice: item.unitPrice || 0,
      quantity: item.quantity || 1,
      totalPrice: item.totalPrice || 0,
      assignedProcesses: item.assignedProcesses || [],
      attachments: item.attachments || []
  })),
  notes: "Standard payment terms: Net 30. Delivery: 4 weeks ARO.",
  subtotal: sampleOfferItems1.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
  vatAmount: sampleOfferItems1.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 0.10,
  grandTotal: sampleOfferItems1.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 1.10,
};

const sampleOfferItems2: OfferItem[] = [
  {
    id: "item2-1", partName: "Support Bracket SB-05", rawMaterialType: "Mild Steel S275JR", rawMaterialDimension: "Plate 10mm x 100mm x 50mm",
    materialCost: 25, machiningCost: 60, outsourcedProcessesCost: 10, unitPrice: 95, quantity: 50, totalPrice: 4750,
    assignedProcesses: ["Laser Cutting", "Bending", "Powder Coating"], attachments: [{ name: "bracket_drawing.pdf", url: "#", type:"pdf", size: 91011, uploadedAt: new Date().toISOString() }]
  }
];

const sampleOfferSeed2: Omit<OfferFirestoreData, 'id' | 'createdDate' | 'lastUpdated'> = {
  offerNumber: `OFF-${new Date().getFullYear()}-S002`,
  clientName: "Innovative Assemblies Inc.",
  status: "Draft",
  currency: "EUR",
  vatRate: 19,
  items: sampleOfferItems2.map(item => ({
    ...item,
    rawMaterialType: item.rawMaterialType || '',
    rawMaterialDimension: item.rawMaterialDimension || '',
    materialCost: item.materialCost || 0,
    machiningCost: item.machiningCost || 0,
    outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
    unitPrice: item.unitPrice || 0,
    quantity: item.quantity || 1,
    totalPrice: item.totalPrice || 0,
    assignedProcesses: item.assignedProcesses || [],
    attachments: item.attachments || []
  })),
  notes: "Requires special packaging as per spec XYZ.",
  subtotal: sampleOfferItems2.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
  vatAmount: sampleOfferItems2.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 0.19,
  grandTotal: sampleOfferItems2.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 1.19,
};


function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const statusConfig: Record<OfferStatus, { colorClasses: string, label: string }> = {
    Draft: { colorClasses: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "Draft" },
    Sent: { colorClasses: "bg-blue-100 text-blue-700 border-blue-300", label: "Sent" },
    "Under Review": { colorClasses: "bg-purple-100 text-purple-700 border-purple-300", label: "Under Review" },
    Accepted: { colorClasses: "bg-green-100 text-green-700 border-green-300", label: "Accepted" },
    Rejected: { colorClasses: "bg-red-100 text-red-700 border-red-300", label: "Rejected" },
    Archived: { colorClasses: "bg-gray-100 text-gray-700 border-gray-300", label: "Archived" },
  };
  const config = statusConfig[status] || { colorClasses: "bg-gray-200 text-gray-800 border-gray-400", label: status };
  return (
    <Badge variant="outline" className={`capitalize ${config.colorClasses}`}>
      {config.label}
    </Badge>
  );
}

export default function OffersPage() {
  const t = useTranslations('OffersPage');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [offerForPDF, setOfferForPDF] = useState<Offer | null>(null);
  const seededRef = useRef(false);
  const router = useRouter();

  const seedInitialOffers = async () => {
    console.log("Attempting to seed initial offers to Firestore...");
    const batch = writeBatch(db);
    const offersCol = collection(db, OFFERS_COLLECTION_NAME);

    const sampleOffersToAdd = [sampleOfferSeed1, sampleOfferSeed2];

    sampleOffersToAdd.forEach(sample => {
      const newOfferRef = doc(offersCol);
      const offerDataForFirestore: Omit<OfferFirestoreData, 'id'> = {
        ...sample,
        items: sample.items.map(item => ({
          ...item,
          assignedProcesses: item.assignedProcesses || [],
          attachments: item.attachments || [],
          rawMaterialType: item.rawMaterialType || '',
          rawMaterialDimension: item.rawMaterialDimension || '',
        })),
        createdDate: serverTimestamp() as Timestamp,
        lastUpdated: serverTimestamp() as Timestamp,
      };
      batch.set(newOfferRef, offerDataForFirestore);
    });

    try {
      await batch.commit();
      console.log("Successfully seeded initial offers to Firestore.");
      toast({
        title: "Sample Offers Added",
        description: "Initial sample offers have been added to Firestore.",
      });
      return true;
    } catch (error) {
      console.error("Error seeding initial offers to Firestore:", error);
      toast({
        title: "Error Seeding Offers",
        description: "Could not add sample offers to Firestore. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
      return false;
    }
  };


  const fetchOffers = useCallback(async (forceRefetch = false) => {
    setIsLoading(true);
    console.log("Fetching offers from Firestore...");
    try {
      const q = query(collection(db, OFFERS_COLLECTION_NAME), orderBy("createdDate", "desc"));
      const querySnapshot = await getDocs(q);
      console.log(`Fetched ${querySnapshot.size} offers from Firestore.`);

      if (querySnapshot.empty && !seededRef.current && !forceRefetch) {
        console.log("Offers collection is empty in Firestore. Attempting to seed initial data...");
        const seedingSuccessful = await seedInitialOffers();
        if (seedingSuccessful) {
          seededRef.current = true;
          setTimeout(() => fetchOffers(true), 500);
          return;
        } else {
           setOffers([]);
        }
      }

      const fetchedOffers: Offer[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as OfferFirestoreData;

        const createdDateTimestamp = data.createdDate;
        const lastUpdatedTimestamp = data.lastUpdated;

        if (!(createdDateTimestamp instanceof Timestamp)) {
          console.warn(`Offer ${docSnap.id} has invalid or missing createdDate. Skipping. Received:`, createdDateTimestamp);
          return;
        }
        if (!(lastUpdatedTimestamp instanceof Timestamp)) {
          console.warn(`Offer ${docSnap.id} has invalid or missing lastUpdated. Skipping. Received:`, lastUpdatedTimestamp);
          return;
        }

        fetchedOffers.push({
          ...data,
          id: docSnap.id,
          createdDate: createdDateTimestamp.toDate().toISOString(),
          lastUpdated: lastUpdatedTimestamp.toDate().toISOString(),
          items: data.items.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            materialCost: item.materialCost || 0,
            machiningCost: item.machiningCost || 0,
            outsourcedProcessesCost: item.outsourcedProcessesCost || 0,
            unitPrice: item.unitPrice || 0,
            quantity: item.quantity || 1,
            totalPrice: item.totalPrice || 0,
            assignedProcesses: item.assignedProcesses || [],
            attachments: item.attachments || []
          })),
        });
      });
      setOffers(fetchedOffers);
    } catch (error) {
      console.error("Failed to load offers from Firestore:", error);
      toast({
        title: "Error Loading Offers",
        description: "Could not retrieve offer data from Firestore. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
      setOffers([]);
    } finally {
      console.log("Finished fetching offers. Setting isLoading to false.");
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm("Are you sure you want to delete this offer? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, OFFERS_COLLECTION_NAME, offerId));
      toast({
        title: "Offer Deleted",
        description: `Offer (ID: ${offerId}) has been removed from Firestore.`,
        variant: "default"
      });
      fetchOffers(true);
    } catch (error) {
      console.error("Error deleting offer from Firestore:", error);
      toast({
        title: "Error Deleting Offer",
        description: "Could not delete the offer. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    }
  };

  const handleUpdateOfferStatus = async (offerId: string, newStatus: OfferStatus) => {
    let orderCreatedMessage = "";
    const offerToUpdate = offers.find(o => o.id === offerId);
    if (!offerToUpdate) {
      toast({ title: "Error", description: "Offer not found for status update.", variant: "destructive"});
      return;
    }

    try {
      const offerRef = doc(db, OFFERS_COLLECTION_NAME, offerId);
      await updateDoc(offerRef, {
        status: newStatus,
        lastUpdated: serverTimestamp()
      });

      if (newStatus === "Accepted") {
        const newOrderData: Omit<OrderFirestoreData, 'id'> = {
          offerId: offerToUpdate.id,
          orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`,
          clientName: offerToUpdate.clientName,
          orderDate: Timestamp.now(),
          items: offerToUpdate.items.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            assignedProcesses: item.assignedProcesses || [],
            attachments: item.attachments || []
          })),
          currency: offerToUpdate.currency,
          subtotal: offerToUpdate.subtotal,
          vatAmount: offerToUpdate.vatAmount,
          grandTotal: offerToUpdate.grandTotal,
          status: "New",
        };

        const orderDocRef = await addDoc(collection(db, ORDERS_COLLECTION_NAME), newOrderData);
        orderCreatedMessage = `Order ${newOrderData.orderNumber} created (ID: ${orderDocRef.id}).`;
      }

      toast({
        title: "Offer Status Updated",
        description: `Offer ${offerToUpdate.offerNumber || offerId} status changed to ${newStatus}. ${orderCreatedMessage}`,
      });
      fetchOffers(true);
    } catch (e) {
      console.error("Failed to update offer status or create order in Firestore:", e);
      toast({
        title: "Update Failed",
        description: "Could not update offer status or create order. " + (e instanceof Error ? e.message : String(e)),
        variant: "destructive",
      });
    }
  };

  const handleDownloadOfferPDF = async (offerToDownload: Offer) => {
    setOfferForPDF(offerToDownload);

    try {
      const html2pdf = (await import('html2pdf.js')).default;
      setTimeout(() => {
        if (pdfContainerRef.current && html2pdf) {
          const element = pdfContainerRef.current;
          const opt = {
            margin:       0.5,
            filename:     `Offer-${offerToDownload.offerNumber}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
          };
          html2pdf().from(element).set(opt).save().then(() => {
            setOfferForPDF(null);
          }).catch(pdfError => {
            console.error("Error during PDF generation:", pdfError);
            toast({
              title: "PDF Generation Error",
              description: "An error occurred while generating the PDF.",
              variant: "destructive",
            });
            setOfferForPDF(null);
          });
        } else {
          console.error("PDF container or html2pdf library not ready.");
          toast({
            title: "PDF Generation Error",
            description: "Could not prepare the PDF for download. Please try again.",
            variant: "destructive",
          });
          setOfferForPDF(null);
        }
      }, 100);
    } catch (importError) {
      console.error("Failed to import html2pdf.js:", importError);
      toast({
        title: "PDF Library Error",
        description: "Could not load the PDF generation library. Please try again.",
        variant: "destructive",
      });
      setOfferForPDF(null);
    }
  };


  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Link href="/offers/new" passHref>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> {t('createNewOfferButton')}
            </Button>
          </Link>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Loading offers...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table_offerNumber')}</TableHead>
                  <TableHead>{t('table_client')}</TableHead>
                  <TableHead>{t('table_date')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead className="text-right">{t('table_amount')}</TableHead>
                  <TableHead className="text-right">{t('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length > 0 ? offers.map((offer) => (
                  <TableRow key={offer.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{offer.offerNumber}</TableCell>
                    <TableCell>{offer.clientName}</TableCell>
                    <TableCell>{new Date(offer.createdDate).toLocaleDateString()}</TableCell>
                    <TableCell><OfferStatusBadge status={offer.status} /></TableCell>
                    <TableCell className="text-right">{offer.currency} {offer.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Offer Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => alert(`View offer: ${offer.offerNumber} (View not implemented yet)`)}>
                            <Eye className="mr-2 h-4 w-4" /> {t('actions_view')}
                          </DropdownMenuItem>
                          <Link href={`/offers/edit/${offer.id}`} passHref legacyBehavior>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" /> {t('actions_edit')}
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuItem onClick={() => handleDownloadOfferPDF(offer)}>
                            <FileDown className="mr-2 h-4 w-4" /> {t('actions_downloadPdf')}
                          </DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <Flag className="mr-2 h-4 w-4" /> {t('actions_changeStatus')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {availableOfferStatuses.map((statusValue) => (
                                  <DropdownMenuItem
                                    key={statusValue}
                                    onClick={() => handleUpdateOfferStatus(offer.id, statusValue)}
                                    disabled={offer.status === statusValue}
                                  >
                                    {statusValue}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:!text-destructive hover:!text-destructive focus:!bg-destructive/10"
                            onClick={() => handleDeleteOffer(offer.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> {t('actions_delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )) : (
                   <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No offers found. Click "Create New Offer" to get started, or ensure sample data is seeded if this is the first run.
                      </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm', height: '297mm' }}>
        {offerForPDF && <OfferPDFDocument offer={offerForPDF} ref={pdfContainerRef} />}
      </div>
    </div>
  );
}
