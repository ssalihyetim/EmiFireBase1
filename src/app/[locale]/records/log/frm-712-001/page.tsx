
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Wrench, Loader2 } from "lucide-react";
import type { EquipmentMaintenanceLogEntry, EquipmentMaintenanceLogEntryFirestore } from "@/types"; // Updated type
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { AddMaintenanceLogEntryDialog } from '@/components/records/equipment-maintenance-log/add-entry-dialog';
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp } from "firebase/firestore";
import { useTranslations } from 'next-intl';

const MAINTENANCE_LOG_COLLECTION_NAME = "maintenanceLog_FRM-712-001";

export default function EquipmentMaintenanceLogPage() {
  const t = useTranslations('EquipmentMaintenanceLogPage');
  const tLogPage = useTranslations('LogPage');
  const [logEntries, setLogEntries] = useState<EquipmentMaintenanceLogEntry[]>([]);
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogEntries = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, MAINTENANCE_LOG_COLLECTION_NAME), orderBy("maintenanceDate", "desc"));
      const querySnapshot = await getDocs(q);
      const entries: EquipmentMaintenanceLogEntry[] = [];
      querySnapshot.forEach((docSnap) => { // Changed variable name to avoid conflict
        const data = docSnap.data() as EquipmentMaintenanceLogEntryFirestore;
        entries.push({
          ...data,
          id: docSnap.id, 
          maintenanceDate: (data.maintenanceDate as Timestamp).toDate().toISOString(),
          nextDueDate: data.nextDueDate ? (data.nextDueDate as Timestamp).toDate().toISOString() : undefined,
          createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
        });
      });
      setLogEntries(entries);
    } catch (error) {
      console.error("Failed to load maintenance log entries from Firestore:", error);
      setLogEntries([]);
      toast({
        title: tLogPage('error_deleting_toast_title'), // Example of using a generic log page translation
        description: "Could not retrieve maintenance log data from Firestore.", // Specific message for this page
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, tLogPage]);

  useEffect(() => {
    fetchLogEntries();
  }, [fetchLogEntries]);

  const handleEntryAdded = () => {
    fetchLogEntries(); 
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm(tLogPage('confirm_delete_entry_message'))) {
      try {
        await deleteDoc(doc(db, MAINTENANCE_LOG_COLLECTION_NAME, entryId));
        toast({
          title: tLogPage('entry_deleted_toast_title'),
          description: tLogPage('entry_deleted_toast_description'),
        });
        fetchLogEntries(); 
      } catch (error) {
        console.error("Failed to delete maintenance log entry from Firestore:", error);
        toast({
          title: tLogPage('error_deleting_toast_title'),
          description: tLogPage('error_deleting_toast_description'),
          variant: "destructive",
        });
      }
    }
  };
  
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return t('na', {defaultMessage: "N/A"});
    try {
      const dateObj = parseISO(dateString);
      return isValid(dateObj) ? format(dateObj, "PP") : "Invalid Date";
    } catch (e) {
      return "Invalid Date Format";
    }
  };

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button onClick={() => setIsAddEntryDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> {tLogPage('button_addNewEntry')}
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5 text-primary" /> {t('logEntriesTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{tLogPage('loading_entries')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table_equipmentId')}</TableHead>
                  <TableHead>{t('table_equipmentName')}</TableHead>
                  <TableHead>{t('table_maintDate')}</TableHead>
                  <TableHead>{t('table_type')}</TableHead>
                  <TableHead>{t('table_description')}</TableHead>
                  <TableHead>{t('table_performedBy')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead>{t('table_nextDue')}</TableHead>
                  <TableHead className="text-right">{tLogPage('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{entry.equipmentId}</TableCell>
                    <TableCell>{entry.equipmentName}</TableCell>
                    <TableCell>{formatDateDisplay(entry.maintenanceDate)}</TableCell>
                    <TableCell>{entry.maintenanceType}</TableCell>
                    <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                    <TableCell>{entry.performedBy}</TableCell>
                    <TableCell>{entry.status}</TableCell>
                    <TableCell>{formatDateDisplay(entry.nextDueDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)} title={tLogPage('actions_deleteEntry')}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">{tLogPage('actions_deleteEntry')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {logEntries.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                      {tLogPage('no_entries_found')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddMaintenanceLogEntryDialog
        open={isAddEntryDialogOpen}
        onOpenChange={setIsAddEntryDialogOpen}
        onEntryAdded={handleEntryAdded}
      />
    </div>
  );
}

