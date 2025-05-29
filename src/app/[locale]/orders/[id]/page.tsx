
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation'; // Standard useParams
import { useRouter, Link } from '@/navigation'; // next-intl's useRouter and Link
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Removed CardDescription
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, ArrowLeft, Package, CheckCircle2, XCircle, Info, ListOrdered, Paperclip, Truck } from 'lucide-react'; // Added Truck
import type { Order, OrderFirestoreData, OfferItem, OrderStatus, Attachment } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { useTranslations } from 'next-intl';

const ORDERS_COLLECTION_NAME = "orders";

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig: Record<OrderStatus, { icon: React.ElementType, colorClasses: string, label: string }> = {
    New: { icon: AlertTriangle, colorClasses: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "New" },
    Processing: { icon: Loader2, colorClasses: "bg-blue-100 text-blue-700 border-blue-300", label: "Processing" },
    Shipped: { icon: Truck, colorClasses: "bg-indigo-100 text-indigo-700 border-indigo-300", label: "Shipped" },
    Delivered: { icon: CheckCircle2, colorClasses: "bg-green-100 text-green-700 border-green-300", label: "Delivered" },
    Cancelled: { icon: XCircle, colorClasses: "bg-red-100 text-red-700 border-red-300", label: "Cancelled" },
  };
   const config = statusConfig[status] || { icon: Info, colorClasses: "bg-gray-200 text-gray-800 border-gray-400", label: status };
  const IconComponent = config.icon;

  return (
    <Badge variant="outline" className={`capitalize ${config.colorClasses}`}>
      <IconComponent className={`h-3 w-3 mr-1 ${status === 'Processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}


export default function OrderDetailPage() {
  const t = useTranslations('OrderDetailPage');
  const router = useRouter();
  const params = useParams(); // params will include locale and id
  const { toast } = useToast();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const orderId = params?.id as string;

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false);
      setOrder(null);
      return;
    }
    setIsLoading(true);
    try {
      const orderRef = doc(db, ORDERS_COLLECTION_NAME, orderId);
      const docSnap = await getDoc(orderRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as OrderFirestoreData;
        setOrder({
          ...data,
          id: docSnap.id,
          orderDate: (data.orderDate as Timestamp).toDate().toISOString(),
          dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate().toISOString() : undefined,
          sentDate: data.sentDate ? (data.sentDate as Timestamp).toDate().toISOString() : undefined,
          items: data.items.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            assignedProcesses: item.assignedProcesses || [],
            attachments: item.attachments || []
          })),
        });
      } else {
        setOrder(null);
        toast({
          title: t('notFound_title'),
          description: t('notFound_description'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to load order:", error);
      setOrder(null);
      toast({
        title: "Error", // Generic error, consider adding to translations
        description: "Failed to load order data. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [orderId, toast, t]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (isLoading || order === undefined) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title={t('loading_title')} />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto p-4">
        <PageHeader title={t('notFound_title')} description={t('notFound_description')} />
        <Button onClick={() => router.push('/orders/active')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('button_backToActiveOrders')}
        </Button>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('na');
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        title={`${t('page_title_prefix')} ${order.orderNumber}`}
        description={`${t('page_description_prefix')} ${order.clientName}`}
        actions={
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('button_back')}
          </Button>
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Info className="mr-2 h-5 w-5 text-primary" />
              {t('info_card_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_orderNumber')}</span>
              <span>{order.orderNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_client')}</span>
              <span>{order.clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_orderDate')}</span>
              <span>{formatDate(order.orderDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium text-muted-foreground">{t('info_status')}</span>
              <OrderStatusBadge status={order.status} />
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_dueDate')}</span>
              <span>{formatDate(order.dueDate)}</span>
            </div>
             <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_sentDate')}</span>
              <span>{formatDate(order.sentDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('info_trackingInfo')}</span>
              <span>{order.trackingInfo || t('na')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Info className="mr-2 h-5 w-5 text-primary" /> {/* Re-used Info, consider DollarSign for financial */}
              {t('financial_card_title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('financial_currency')}</span>
              <span>{order.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('financial_subtotal')}</span>
              <span>{order.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-muted-foreground">{t('financial_vatAmount')}</span>
              <span>{order.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <hr/>
            <div className="flex justify-between font-bold text-base">
              <span>{t('financial_grandTotal')}</span>
              <span>{order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <ListOrdered className="mr-2 h-5 w-5 text-primary" />
            {t('items_card_title_prefix')} ({order.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('items_table_partName')}</TableHead>
                  <TableHead>{t('items_table_material')}</TableHead>
                  <TableHead>{t('items_table_dimensions')}</TableHead>
                  <TableHead className="text-center">{t('items_table_qty')}</TableHead>
                  <TableHead className="text-right">{t('items_table_unitPrice')}</TableHead>
                  <TableHead className="text-right">{t('items_table_totalPrice')}</TableHead>
                  <TableHead>{t('items_table_assignedProcesses')}</TableHead>
                  <TableHead>{t('items_table_attachments')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.partName}</TableCell>
                    <TableCell>{item.rawMaterialType || t('na')}</TableCell>
                    <TableCell>{item.rawMaterialDimension || t('na')}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency}</TableCell>
                    <TableCell className="text-right">{item.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {order.currency}</TableCell>
                    <TableCell>
                      {item.assignedProcesses && item.assignedProcesses.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.assignedProcesses.map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">{t('na')}</span>}
                    </TableCell>
                    <TableCell>
                      {item.attachments && item.attachments.length > 0 ? (
                        <ul className="space-y-0.5">
                          {item.attachments.map((att: Attachment) => (
                            <li key={att.url} className="flex items-center text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3 mr-1 flex-shrink-0" />
                              <a href={att.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{att.name}</a>
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-xs text-muted-foreground">{t('none')}</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
