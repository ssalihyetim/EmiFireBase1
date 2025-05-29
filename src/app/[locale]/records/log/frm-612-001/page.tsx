
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, AlertOctagon, Loader2 } from "lucide-react"; 
import type { RiskAssessmentLogEntry, RiskAssessmentLogEntryFirestore, RiskLevel, RiskActionStatus } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, isValid } from 'date-fns';
import { AddRiskAssessmentLogEntryDialog } from '@/components/records/risk-assessment-log/add-entry-dialog';
import { Badge } from '@/components/ui/badge';
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy, Timestamp, writeBatch, serverTimestamp } from "firebase/firestore";
import { useTranslations } from 'next-intl';

const RISK_ASSESSMENT_COLLECTION_NAME = "riskAssessmentLog_FRM-612-001";

const initialRiskEntriesSeed: Omit<RiskAssessmentLogEntryFirestore, 'id' | 'createdAt' | 'logDocId'>[] = [
  {
    riskIdentificationDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 30))),
    riskSource: 'Supplier Evaluation',
    riskDescription: 'Single source supplier for critical raw material (e.g., specific aerospace grade aluminum alloy).',
    potentialImpact: 'Production Stoppage, Delivery Delays, Increased Costs',
    likelihood: 'Medium',
    severity: 'High',
    riskLevel: 'High',
    mitigationActions: 'Identify and qualify alternative supplier. Increase safety stock for critical material.',
    responsiblePerson: 'Purchasing Manager',
    actionStatus: 'In Progress',
    completionTargetDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 60))),
    notes: 'Alternative supplier audit scheduled for next month.'
  },
  {
    riskIdentificationDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 15))),
    riskSource: 'Internal Process Review',
    riskDescription: 'Potential for human error during complex 5-axis CNC machine setup leading to scrapped parts.',
    potentialImpact: 'Increased Scrap Rate, Rework Costs, Delivery Delays',
    likelihood: 'Medium',
    severity: 'Medium',
    riskLevel: 'Medium',
    mitigationActions: 'Develop detailed setup checklist (WI-851-001). Implement mandatory two-person verification for critical setups. Additional operator training.',
    responsiblePerson: 'Production Manager',
    actionStatus: 'Open',
    completionTargetDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() + 30))),
  },
  {
    riskIdentificationDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 60))),
    riskSource: 'Maintenance Review',
    riskDescription: 'Key CNC machine (5-axis MC) approaching end of recommended major service interval.',
    potentialImpact: 'Unexpected breakdown, production delays, quality issues if precision degrades.',
    likelihood: 'Medium',
    severity: 'High',
    riskLevel: 'High',
    mitigationActions: 'Schedule and perform major service. Identify backup machining options if feasible during service downtime.',
    responsiblePerson: 'Maintenance Manager',
    actionStatus: 'Completed',
    completionTargetDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 10))),
    effectivenessReviewDate: Timestamp.fromDate(new Date(new Date().setDate(new Date().getDate() - 5))),
    notes: 'Service completed successfully. Machine performance verified.'
  },
];


export default function RiskAssessmentLogPage() {
  const t = useTranslations('RiskAssessmentLogPage');
  const tLogPage = useTranslations('LogPage');
  const [logEntries, setLogEntries] = useState<RiskAssessmentLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);
  const seededRef = useRef(false);

  const seedInitialData = async () => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, RISK_ASSESSMENT_COLLECTION_NAME);
    
    initialRiskEntriesSeed.forEach(entrySeed => {
      const docRef = doc(collectionRef); 
      const entryData: RiskAssessmentLogEntryFirestore = {
        ...entrySeed,
        logDocId: 'FRM-612-001',
        createdAt: serverTimestamp() as Timestamp,
      };
      batch.set(docRef, entryData);
    });

    try {
      await batch.commit();
      toast({
        title: "Sample Data Seeded",
        description: "Initial risk assessment examples have been added to Firestore.",
      });
      return true;
    } catch (error) {
      console.error("Error seeding initial risk assessment data:", error);
      toast({
        title: "Error Seeding Data",
        description: "Could not add sample risk assessment data.",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchLogEntries = useCallback(async (forceRefetch = false) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, RISK_ASSESSMENT_COLLECTION_NAME), orderBy("riskIdentificationDate", "desc"));
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
        const entries: RiskAssessmentLogEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data() as RiskAssessmentLogEntryFirestore;
          entries.push({
            ...data,
            id: docSnap.id,
            riskIdentificationDate: (data.riskIdentificationDate as Timestamp).toDate().toISOString(),
            completionTargetDate: data.completionTargetDate ? (data.completionTargetDate as Timestamp).toDate().toISOString() : undefined,
            effectivenessReviewDate: data.effectivenessReviewDate ? (data.effectivenessReviewDate as Timestamp).toDate().toISOString() : undefined,
            createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
          });
        });
        setLogEntries(entries);
      }
    } catch (error) {
      console.error("Failed to load risk assessment log entries from Firestore:", error);
      setLogEntries([]);
      toast({
        title: tLogPage('error_deleting_toast_title'),
        description: "Could not retrieve risk assessment log data from Firestore.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, tLogPage, seededRef]);

  useEffect(() => {
    fetchLogEntries();
  }, [fetchLogEntries]);

  const handleEntryAdded = () => {
    fetchLogEntries(true); 
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm(tLogPage('confirm_delete_entry_message'))) {
      try {
        await deleteDoc(doc(db, RISK_ASSESSMENT_COLLECTION_NAME, entryId));
        toast({
          title: tLogPage('entry_deleted_toast_title'),
          description: tLogPage('entry_deleted_toast_description'),
        });
        fetchLogEntries(true);
      } catch (error) {
        console.error("Failed to delete risk log entry from Firestore:", error);
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

  const getRiskLevelBadgeVariant = (level?: RiskLevel): 'destructive' | 'secondary' | 'default' | 'outline' => {
    switch (level) {
      case 'High': return 'destructive';
      case 'Medium': return 'secondary'; 
      case 'Low': return 'default'; 
      default: return 'outline';
    }
  };
  
  const getActionStatusBadgeVariant = (status?: RiskActionStatus): 'destructive' | 'secondary' | 'default' | 'outline' => {
    switch (status) {
      case 'Open': return 'secondary';
      case 'In Progress': return 'default'; 
      case 'Completed': return 'default'; 
      case 'Closed': return 'outline';
      default: return 'outline';
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
            <AlertOctagon className="mr-2 h-5 w-5 text-destructive" /> {t('logEntriesTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{tLogPage('loading_entries')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">{t('table_identifiedDate')}</TableHead>
                    <TableHead className="min-w-[150px]">{t('table_riskSource')}</TableHead>
                    <TableHead className="min-w-[250px]">{t('table_description')}</TableHead>
                    <TableHead className="min-w-[150px]">{t('table_potentialImpact')}</TableHead>
                    <TableHead className="min-w-[80px] text-center">{t('table_likelihood')}</TableHead>
                    <TableHead className="min-w-[80px] text-center">{t('table_severity')}</TableHead>
                    <TableHead className="min-w-[100px] text-center">{t('table_riskLevel')}</TableHead>
                    <TableHead className="min-w-[250px]">{t('table_mitigationActions')}</TableHead>
                    <TableHead className="min-w-[150px]">{t('table_responsible')}</TableHead>
                    <TableHead className="min-w-[120px] text-center">{t('table_targetDate')}</TableHead>
                    <TableHead className="min-w-[120px] text-center">{t('table_status')}</TableHead>
                    <TableHead className="min-w-[120px] text-center">{t('table_reviewDate')}</TableHead>
                    <TableHead className="min-w-[150px]">{t('table_notes')}</TableHead>
                    <TableHead className="text-right sticky right-0 bg-card">{tLogPage('table_actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logEntries.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-muted/10 text-xs">
                      <TableCell>{formatDateDisplay(entry.riskIdentificationDate)}</TableCell>
                      <TableCell>{entry.riskSource}</TableCell>
                      <TableCell className="whitespace-pre-wrap max-w-xs">{entry.riskDescription}</TableCell>
                      <TableCell>{entry.potentialImpact}</TableCell>
                      <TableCell className="text-center">{entry.likelihood}</TableCell>
                      <TableCell className="text-center">{entry.severity}</TableCell>
                      <TableCell className="text-center">
                          <Badge variant={getRiskLevelBadgeVariant(entry.riskLevel)}>{entry.riskLevel}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap max-w-xs">{entry.mitigationActions}</TableCell>
                      <TableCell>{entry.responsiblePerson}</TableCell>
                      <TableCell className="text-center">{formatDateDisplay(entry.completionTargetDate)}</TableCell>
                      <TableCell className="text-center">
                          <Badge variant={getActionStatusBadgeVariant(entry.actionStatus)}>{entry.actionStatus}</Badge>
                      </TableCell>
                      <TableCell className="text-center">{formatDateDisplay(entry.effectivenessReviewDate)}</TableCell>
                      <TableCell className="whitespace-pre-wrap max-w-xs">{entry.notes || t('na', {defaultMessage: "N/A"})}</TableCell>
                      <TableCell className="text-right sticky right-0 bg-card">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)} title={tLogPage('actions_deleteEntry')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                          <span className="sr-only">{tLogPage('actions_deleteEntry')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {logEntries.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center h-24 text-muted-foreground">
                        {tLogPage('no_entries_found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 shadow-md">
        <CardHeader>
          <CardTitle>{t('statusDefinitions_title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <h4 className="font-semibold">{t('statusDefinitions_riskActionStatus_title')}</h4>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>{t('statusDefinitions_riskActionStatus_open').split(':')[0]}:</strong> {t('statusDefinitions_riskActionStatus_open').split(':').slice(1).join(':').trim()}</li>
              <li><strong>{t('statusDefinitions_riskActionStatus_inProgress').split(':')[0]}:</strong> {t('statusDefinitions_riskActionStatus_inProgress').split(':').slice(1).join(':').trim()}</li>
              <li><strong>{t('statusDefinitions_riskActionStatus_completed').split(':')[0]}:</strong> {t('statusDefinitions_riskActionStatus_completed').split(':').slice(1).join(':').trim()}</li>
              <li><strong>{t('statusDefinitions_riskActionStatus_closed').split(':')[0]}:</strong> {t('statusDefinitions_riskActionStatus_closed').split(':').slice(1).join(':').trim()}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold">{t('statusDefinitions_riskLevel_title')}</h4>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><strong>{t('statusDefinitions_riskLevel_low').split(':')[0]}:</strong> {t('statusDefinitions_riskLevel_low').split(':').slice(1).join(':').trim()}</li>
              <li><strong>{t('statusDefinitions_riskLevel_medium').split(':')[0]}:</strong> {t('statusDefinitions_riskLevel_medium').split(':').slice(1).join(':').trim()}</li>
              <li><strong>{t('statusDefinitions_riskLevel_high').split(':')[0]}:</strong> {t('statusDefinitions_riskLevel_high').split(':').slice(1).join(':').trim()}</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter>
            <p className="text-xs text-muted-foreground">{t('statusDefinitions_footer_note')}</p>
        </CardFooter>
      </Card>

      <AddRiskAssessmentLogEntryDialog
        open={isAddEntryDialogOpen}
        onOpenChange={setIsAddEntryDialogOpen}
        onEntryAdded={handleEntryAdded}
      />
    </div>
  );
}
