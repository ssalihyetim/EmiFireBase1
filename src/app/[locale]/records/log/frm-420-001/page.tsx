
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Users, Loader2 } from "lucide-react";
import type { InterestedPartyRegisterEntry, InterestedPartyRegisterEntryFirestore } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { AddInterestedPartyRegisterEntryDialog } from '@/components/records/interested-party-register/add-entry-dialog';
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp, writeBatch, serverTimestamp } from "firebase/firestore";
import { useTranslations } from 'next-intl';

const INTERESTED_PARTY_COLLECTION_NAME = "interestedPartyRegister_FRM-420-001";

const initialInterestedPartyEntriesSeed: Omit<InterestedPartyRegisterEntryFirestore, 'id' | 'createdAt' | 'logDocId'>[] = [
  {
    partyType: 'Customer',
    partyName: 'Aerospace Tier 1 / OEMs',
    needsAndExpectations: 'Conforming parts (zero defects), on-time delivery, AS9100D compliance, FAIR, traceability, product safety, competitive pricing, responsive communication.',
    monitoringMethod: 'Customer scorecards, feedback, audits, OTD & quality metrics.',
    reviewFrequency: 'Quarterly / Annually',
    lastReviewedDate: Timestamp.fromDate(new Date(new Date().setFullYear(new Date().getFullYear() -1))), 
    notes: 'Key customers for precision aerospace components.'
  },
  {
    partyType: 'Regulatory Body',
    partyName: 'EASA / FAA / DGCA',
    needsAndExpectations: 'Compliance with aviation safety regulations, airworthiness, product certification, record keeping, traceability.',
    monitoringMethod: 'Regulatory audits, internal compliance checks, legal updates.',
    reviewFrequency: 'Annually / As Required',
    notes: 'Compliance with national and international aviation standards is critical.'
  },
  {
    partyType: 'Employee',
    partyName: 'Euro Metal Docs Workforce',
    needsAndExpectations: 'Safe working environment, fair wages, training & development, clear communication, job security, ethical treatment.',
    monitoringMethod: 'Surveys, feedback sessions, safety metrics, performance reviews.',
    reviewFrequency: 'Annually / Ongoing',
    notes: 'Valued members contributing to quality and productivity.'
  },
  {
    partyType: 'Supplier / External Provider',
    partyName: 'Material & Special Process Suppliers',
    needsAndExpectations: 'Clear requirements, timely payments, fair dealing, partnership opportunities.',
    monitoringMethod: 'Supplier audits, performance metrics (OTD, Quality), feedback.',
    reviewFrequency: 'Annually / Per Contract',
    notes: 'Critical for supply chain integrity and special process capabilities.'
  },
];

export default function InterestedPartyRegisterPage() {
  const t = useTranslations('InterestedPartyRegisterPage');
  const tLogPage = useTranslations('LogPage');
  const [logEntries, setLogEntries] = useState<InterestedPartyRegisterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const seededRef = useRef(false);

  const seedInitialData = async () => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, INTERESTED_PARTY_COLLECTION_NAME);
    
    initialInterestedPartyEntriesSeed.forEach(entrySeed => {
      const docRef = doc(collectionRef); 
      const entryData: InterestedPartyRegisterEntryFirestore = {
        ...entrySeed,
        logDocId: 'FRM-420-001',
        createdAt: serverTimestamp() as Timestamp,
      };
      batch.set(docRef, entryData);
    });

    try {
      await batch.commit();
      toast({
        title: "Sample Data Seeded",
        description: "Initial interested party examples have been added to Firestore.",
      });
      return true;
    } catch (error) {
      console.error("Error seeding initial interested party data:", error);
      toast({
        title: "Error Seeding Data",
        description: "Could not add sample interested party data.",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchLogEntries = useCallback(async (forceRefetch = false) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, INTERESTED_PARTY_COLLECTION_NAME), orderBy("partyName", "asc"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty && !seededRef.current && !forceRefetch) {
        const seedingSuccessful = await seedInitialData();
        if (seedingSuccessful) {
          seededRef.current = true;
          fetchLogEntries(true); 
          return; 
        } else {
          setLogEntries([]);
        }
      } else {
        const entries: InterestedPartyRegisterEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as InterestedPartyRegisterEntryFirestore;
          entries.push({
            ...data,
            id: docSnap.id,
            lastReviewedDate: data.lastReviewedDate ? (data.lastReviewedDate as Timestamp).toDate().toISOString() : undefined,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
          });
        });
        setLogEntries(entries);
      }
    } catch (error) {
      console.error("Failed to load interested party log entries from Firestore:", error);
      setLogEntries([]);
      toast({
        title: tLogPage('error_deleting_toast_title'),
        description: "Could not retrieve interested party log data from Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, tLogPage, seededRef]); // Added seededRef to dependency array

  useEffect(() => {
    fetchLogEntries();
  }, [fetchLogEntries]);

  const handleEntryAdded = () => {
    fetchLogEntries(true); 
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm(tLogPage('confirm_delete_entry_message'))) {
      try {
        await deleteDoc(doc(db, INTERESTED_PARTY_COLLECTION_NAME, entryId));
        toast({
          title: tLogPage('entry_deleted_toast_title'),
          description: tLogPage('entry_deleted_toast_description'),
        });
        fetchLogEntries(true);
      } catch (error) {
        console.error("Failed to delete interested party log entry from Firestore:", error);
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
            <Users className="mr-2 h-5 w-5 text-primary" /> {t('logEntriesTitle')}
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
                  <TableHead>{t('table_partyType')}</TableHead>
                  <TableHead>{t('table_partyName')}</TableHead>
                  <TableHead>{t('table_needsAndExpectations')}</TableHead>
                  <TableHead>{t('table_monitoringMethod')}</TableHead>
                  <TableHead>{t('table_reviewFrequency')}</TableHead>
                  <TableHead>{t('table_lastReviewed')}</TableHead>
                  <TableHead>{t('table_notes')}</TableHead>
                  <TableHead className="text-right">{tLogPage('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logEntries.map((entry) => (
                  <TableRow key={entry.id} className="hover:bg-muted/10">
                    <TableCell>{entry.partyType}</TableCell>
                    <TableCell className="font-medium">{entry.partyName}</TableCell>
                    <TableCell className="max-w-xs truncate whitespace-nowrap overflow-hidden text-ellipsis hover:whitespace-normal hover:overflow-visible">{entry.needsAndExpectations}</TableCell>
                    <TableCell>{entry.monitoringMethod}</TableCell>
                    <TableCell>{entry.reviewFrequency}</TableCell>
                    <TableCell>{formatDateDisplay(entry.lastReviewedDate)}</TableCell>
                    <TableCell className="max-w-xs truncate whitespace-nowrap overflow-hidden text-ellipsis hover:whitespace-normal hover:overflow-visible">{entry.notes || t('na', {defaultMessage: "N/A"})}</TableCell>
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
                    <TableCell colSpan={8} className="text-center h-24 text-muted-foreground">
                      {tLogPage('no_entries_found')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddInterestedPartyRegisterEntryDialog
        open={isAddEntryDialogOpen}
        onOpenChange={setIsAddEntryDialogOpen}
        onEntryAdded={handleEntryAdded}
      />
    </div>
  );
}
