
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Link } from '@/navigation'; // Use next-intl's Link
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PackageCheck, Truck, CheckCircle2, MoreHorizontal, FileSearch, CircleAlert, Loader2 as LoaderIcon, XCircle } from "lucide-react";
import type { Order, OrderStatus, OrderFirestoreData } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";

const ORDERS_COLLECTION_NAME = "orders";

function SentOrderStatusBadge({ status }: { status: OrderStatus }) {
   const statusConfig: Record<OrderStatus, { icon: React.ElementType, colorClasses: string, label: string }> = {
    New: { icon: CircleAlert, colorClasses: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "New" },
    Processing: { icon: LoaderIcon, colorClasses: "bg-blue-100 text-blue-700 border-blue-300", label: "Processing" },
    Shipped: { icon: Truck, colorClasses: "bg-indigo-100 text-indigo-700 border-indigo-300", label: "Shipped" },
    Delivered: { icon: CheckCircle2, colorClasses: "bg-green-100 text-green-700 border-green-300", label: "Delivered" },
    Cancelled: { icon: XCircle, colorClasses: "bg-red-100 text-red-700 border-red-300", label: "Cancelled" },
  };

  const config = statusConfig[status] || { icon: PackageCheck, colorClasses: "bg-gray-100 text-gray-700 border-gray-300", label: status };
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`capitalize ${config.colorClasses}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export default function SentOrdersPage() {
  const t = useTranslations('SentOrdersPage');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSentOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      // Query for all orders and filter client-side for sent/completed ones.
      const q = query(collection(db, ORDERS_COLLECTION_NAME), orderBy("orderDate", "desc"));
      const querySnapshot = await getDocs(q);
      const allOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as OrderFirestoreData;

        const orderDateTimestamp = data.orderDate;
        if (!(orderDateTimestamp instanceof Timestamp)) {
            console.warn(`Sent Order ${docSnap.id} has invalid or missing orderDate. Skipping. Received:`, orderDateTimestamp);
            return; 
        }
        
        allOrders.push({
          ...data,
          id: docSnap.id,
          orderDate: orderDateTimestamp.toDate().toISOString(),
          dueDate: data.dueDate ? (data.dueDate as Timestamp).toDate().toISOString() : undefined,
          sentDate: data.sentDate ? (data.sentDate as Timestamp).toDate().toISOString() : undefined,
          items: data.items.map(item => ({ // Ensure items are correctly mapped
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            assignedProcesses: item.assignedProcesses || [],
            attachments: item.attachments || []
          })),
        });
      });

      const sentOrCompletedOrders = allOrders.filter(order => 
        order.status === "Shipped" || order.status === "Delivered" || order.status === "Cancelled"
      );
      setOrders(sentOrCompletedOrders);

    } catch (error) {
      console.error("Failed to load sent orders from Firestore:", error);
      setOrders([]);
      toast({
        title: t('error_loading_orders_toast_title'),
        description: t('error_loading_orders_toast_description', { error: (error instanceof Error ? error.message : String(error)) }),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchSentOrders();
  }, [fetchSentOrders]);

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('orderHistoryTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <LoaderIcon className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{t('loading_orders')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table_orderNumber')}</TableHead>
                  <TableHead>{t('table_client')}</TableHead>
                  <TableHead>{t('table_sentDate')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead className="text-right">{t('table_totalAmount')}</TableHead>
                  <TableHead>{t('table_trackingInfo')}</TableHead>
                  <TableHead className="text-right">{t('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{order.sentDate ? new Date(order.sentDate).toLocaleDateString() : t('na', {defaultMessage: "N/A"})}</TableCell>
                    <TableCell><SentOrderStatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right">
                      {order.currency} {order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>{order.trackingInfo || t('na', {defaultMessage: "N/A"})}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('table_actions')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/orders/${order.id}`} passHref legacyBehavior>
                            <DropdownMenuItem>
                              <FileSearch className="mr-2 h-4 w-4" /> {t('actions_viewDetails')}
                            </DropdownMenuItem>
                          </Link>
                          {order.trackingInfo && (
                            <DropdownMenuItem onClick={() => alert(`${t('actions_trackPackage')}: ${order.trackingInfo} (Not implemented)`)}>
                              <Truck className="mr-2 h-4 w-4" /> {t('actions_trackPackage')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      {t('no_sent_orders_found')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
