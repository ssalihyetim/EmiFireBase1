
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useRouter } from '@/navigation'; // Use next-intl's Link and useRouter
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Loader2 as LoaderIcon, CircleAlert, CheckCircle2, MoreHorizontal, FilePenLine, XCircle, Eye, Truck, Paperclip } from "lucide-react";
import type { Order, OrderStatus, OrderFirestoreData, OfferItem, Attachment } from "@/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, serverTimestamp, Timestamp, query, orderBy, writeBatch, addDoc, where } from "firebase/firestore";
import { useTranslations } from "next-intl";

const ORDERS_COLLECTION_NAME = "orders";
const availableOrderStatuses: OrderStatus[] = ["New", "Processing", "Shipped", "Delivered", "Cancelled"];

const sampleOrderItems: OfferItem[] = [ // For seeding
    {
      id: "item-ord1-1", partName: "Sensor Housing", rawMaterialType: "Titanium Grade 5", rawMaterialDimension: "Block 100x50x30mm",
      materialCost: 75, machiningCost: 250, outsourcedProcessesCost: 50, unitPrice: 375, quantity: 5, totalPrice: 1875,
      assignedProcesses: ["5-Axis Milling", "Heat Treatment", "Coating"],
      attachments: [{ name: "housing_assy_v3.pdf", url:"#", type:"pdf", size:123, uploadedAt: new Date().toISOString() }, {name: "material_cert.pdf", url:"#", type:"pdf", size:456, uploadedAt: new Date().toISOString()}]
    },
    {
      id: "item-ord1-2", partName: "Connector Pin", rawMaterialType: "Beryllium Copper", rawMaterialDimension: "Rod Dia 10mm",
      materialCost: 5, machiningCost: 10, outsourcedProcessesCost: 2, unitPrice: 17, quantity: 100, totalPrice: 1700,
      assignedProcesses: ["CNC Turning", "Silver Plating"],
      attachments: [{name:"pin_drawing.pdf", url:"#", type:"pdf", size:789, uploadedAt: new Date().toISOString()}]
    }
];

const sampleOrderSeed1: Omit<OrderFirestoreData, 'id' | 'orderDate' | 'sentDate' | 'dueDate'> = { // For Seeding
    offerId: "SAMPLE_OFFER_ID_1",
    orderNumber: `ORD-${new Date().getFullYear()}-S001`,
    clientName: "Aero Structures Ltd.",
    items: sampleOrderItems.map(item => ({
        ...item,
        rawMaterialType: item.rawMaterialType || '',
        rawMaterialDimension: item.rawMaterialDimension || '',
        assignedProcesses: item.assignedProcesses || [],
        attachments: item.attachments || []
    })),
    currency: "EUR",
    subtotal: sampleOrderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0),
    vatAmount: sampleOrderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 0.20,
    grandTotal: sampleOrderItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0) * 1.20,
    status: "Processing",
    trackingInfo: "TRACK12345XYZ"
};


function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const statusConfig: Record<OrderStatus, { icon: React.ElementType, colorClasses: string, label: string }> = {
    New: { icon: CircleAlert, colorClasses: "bg-yellow-100 text-yellow-700 border-yellow-300", label: "New" },
    Processing: { icon: LoaderIcon, colorClasses: "bg-blue-100 text-blue-700 border-blue-300", label: "Processing" },
    Shipped: { icon: Truck, colorClasses: "bg-indigo-100 text-indigo-700 border-indigo-300", label: "Shipped" },
    Delivered: { icon: CheckCircle2, colorClasses: "bg-green-100 text-green-700 border-green-300", label: "Delivered" },
    Cancelled: { icon: XCircle, colorClasses: "bg-red-100 text-red-700 border-red-300", label: "Cancelled" },
  };
  const config = statusConfig[status] || { icon: CircleAlert, colorClasses: "bg-gray-200 text-gray-800 border-gray-400", label: status };
  const IconComponent = config.icon;

  return (
    <Badge variant="outline" className={`capitalize ${config.colorClasses}`}>
      <IconComponent className={`h-3 w-3 mr-1 ${status === 'Processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}

export default function ActiveOrdersPage() {
  const t = useTranslations('ActiveOrdersPage');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const seededRef = useRef(false);
  const router = useRouter();

  const seedInitialOrders = async () => {
    const ordersCol = collection(db, ORDERS_COLLECTION_NAME);

    const orderDataForFirestore: Omit<OrderFirestoreData, 'id'> = {
        ...sampleOrderSeed1,
        items: sampleOrderSeed1.items.map(item => ({
            ...item,
            rawMaterialType: item.rawMaterialType || '',
            rawMaterialDimension: item.rawMaterialDimension || '',
            assignedProcesses: item.assignedProcesses || [],
            attachments: item.attachments || []
        })),
        orderDate: Timestamp.now(),
    };

    try {
        const batch = writeBatch(db);
        const newOrderRef = doc(ordersCol);
        batch.set(newOrderRef, orderDataForFirestore);
        await batch.commit();
        console.log("Successfully seeded initial order to Firestore.");
        toast({
            title: "Sample Order Added",
            description: "An initial sample order has been added to Firestore as the collection was empty.",
        });
        return true;
    } catch (error) {
        console.error("Error seeding initial order:", error);
        toast({
            title: "Error Seeding Order",
            description: "Could not add sample order to Firestore. " + (error instanceof Error ? error.message : String(error)),
            variant: "destructive",
        });
        return false;
    }
  };

  const fetchOrders = useCallback(async (forceRefetch = false) => {
    setIsLoading(true);
    try {
      // Query for all orders initially, then filter client-side for active ones.
      // This simplifies the initial query, especially if composite indexes aren't set up yet for status + date.
      const q = query(collection(db, ORDERS_COLLECTION_NAME), orderBy("orderDate", "desc"));
      const querySnapshot = await getDocs(q);

      const allOrders: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as OrderFirestoreData;
        const orderDateTimestamp = data.orderDate;

        if (!(orderDateTimestamp instanceof Timestamp)) {
            console.warn(`Order ${docSnap.id} has invalid or missing orderDate. Skipping. Received:`, orderDateTimestamp);
            return;
        }

        allOrders.push({
          ...data,
          id: docSnap.id,
          orderDate: orderDateTimestamp.toDate().toISOString(),
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
      });
      
      if (allOrders.length === 0 && !seededRef.current && !forceRefetch) {
        console.log("Orders collection is empty. Attempting to seed initial data...");
        const seedingSuccessful = await seedInitialOrders();
        if (seedingSuccessful) {
          seededRef.current = true;
          fetchOrders(true); // Re-fetch after seeding
          return;
        }
      }

      // Client-side filtering for active orders
      const activeOrders = allOrders.filter(order =>
        order.status !== "Shipped" && order.status !== "Delivered" && order.status !== "Cancelled"
      );
      setOrders(activeOrders);

    } catch (error) {
      console.error("Failed to load active orders from Firestore:", error);
      setOrders([]);
      toast({
        title: t('error_loading_orders_toast_title'),
        description: t('error_loading_orders_toast_description', { error: (error instanceof Error ? error.message : String(error)) }),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t, seededRef]); // Added seededRef

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const orderToUpdate = orders.find(o => o.id === orderId); // Find from current local state to get orderNumber
    if (!orderToUpdate) {
      toast({ title: "Error", description: "Order not found for status update.", variant: "destructive" });
      return;
    }

    try {
      const orderRef = doc(db, ORDERS_COLLECTION_NAME, orderId);
      const updateData: Partial<OrderFirestoreData> = {
        status: newStatus,
      };

      if (newStatus === "Shipped" && !orderToUpdate.sentDate) {
        updateData.sentDate = serverTimestamp() as Timestamp;
      }
      // Potentially add logic for dueDate if status changes to 'Processing' etc.

      await updateDoc(orderRef, updateData);

      toast({
        title: t('order_status_updated_toast_title'),
        description: t('order_status_updated_toast_description', { orderNumber: orderToUpdate.orderNumber, newStatus: newStatus }),
      });
      fetchOrders(true); // Re-fetch to update the list
    } catch (e) {
      console.error("Failed to update order status in Firestore:", e);
      toast({
        title: t('error_updating_order_status_toast_title'),
        description: t('error_updating_order_status_toast_description') + (e instanceof Error ? e.message : String(e)),
        variant: "destructive",
      });
    }
  };

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="mr-2 h-5 w-5 text-primary" /> {t('currentOrdersTitle')}
          </CardTitle>
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
                  <TableHead>{t('table_orderDate')}</TableHead>
                  <TableHead>{t('table_itemsAndDetails')}</TableHead>
                  <TableHead className="text-right">{t('table_total')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead className="text-right">{t('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {order.items.map((item, index) => (
                        <div key={item.id || index} className="mb-1 text-xs">
                          <span className="font-semibold">{item.partName}</span> (Qty: {item.quantity})
                          {(item.rawMaterialType || item.rawMaterialDimension) && 
                            <div className="text-muted-foreground ml-2">
                              Material: {item.rawMaterialType || t('na', {defaultMessage:'N/A'})} ({item.rawMaterialDimension || t('na', {defaultMessage:'N/A'})})
                            </div>
                          }
                          {item.attachments && item.attachments.length > 0 && (
                            <div className="text-muted-foreground ml-2 mt-0.5">
                              Attachments:
                              {item.attachments.map((att, attIdx) => (
                                <div key={attIdx} className="flex items-center text-xs ml-2">
                                  <Paperclip className="h-3 w-3 mr-1 flex-shrink-0" />
                                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate" title={att.name}>{att.name}</a>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {order.items.length === 0 && <span className="text-xs text-muted-foreground">No items</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {order.currency} {order.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell><OrderStatusBadge status={order.status} /></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Order Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Link href={`/orders/${order.id}`} passHref legacyBehavior>
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" /> {t('actions_viewDetails')}
                            </DropdownMenuItem>
                          </Link>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                              <FilePenLine className="mr-2 h-4 w-4" /> {t('actions_changeStatus')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                {availableOrderStatuses.map((statusValue) => (
                                  <DropdownMenuItem
                                    key={statusValue}
                                    onClick={() => handleUpdateOrderStatus(order.id, statusValue)}
                                    disabled={order.status === statusValue}
                                  >
                                    {statusValue === "Processing" && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                                    {statusValue === "Shipped" && <Truck className="mr-2 h-4 w-4" />}
                                    {statusValue === "Delivered" && <CheckCircle2 className="mr-2 h-4 w-4" />}
                                    {statusValue === "New" && <CircleAlert className="mr-2 h-4 w-4" />}
                                    {statusValue === "Cancelled" && <XCircle className="mr-2 h-4 w-4" />}
                                    {statusValue}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                      {t('no_active_orders_found')}
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
