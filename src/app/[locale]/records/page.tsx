
"use client";

import React, { useState, useEffect } from "react";
import { Link } from '@/navigation'; // Use next-intl's Link
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FolderOpen, FilePlus2, Eye, FileText, AlertTriangle, List, Loader2 } from "lucide-react";
import type { QualitySystemDocument, QualityDocumentLevel } from "@/types";
import { getDocumentsByLevel, levelTitles } from "@/lib/quality-system-data";
import { AddMaintenanceLogEntryDialog } from "@/components/records/equipment-maintenance-log/add-entry-dialog";
import { AddInterestedPartyRegisterEntryDialog } from "@/components/records/interested-party-register/add-entry-dialog";
import { AddRiskAssessmentLogEntryDialog } from "@/components/records/risk-assessment-log/add-entry-dialog";
import { useTranslations } from "next-intl";

const RecordRow = ({
  doc,
  onAddEntryClick,
  tActions
}: {
  doc: QualitySystemDocument,
  onAddEntryClick: (docId: string) => void,
  tActions: any
}) => {
  const actions = [];

  if (doc.docType === 'log') {
    actions.push(
      <Link href={`/records/log/${doc.docId.toLowerCase().replace(/_/g, '-')}`} passHref key="view-log">
        <Button variant="outline" size="sm" className="mr-2">
          <List className="mr-2 h-4 w-4" /> {tActions('viewLog')}
        </Button>
      </Link>
    );
    actions.push(
      <Button key="add-entry" variant="default" size="sm" onClick={() => onAddEntryClick(doc.docId)}>
        <FilePlus2 className="mr-2 h-4 w-4" /> {tActions('addEntry')}
      </Button>
    );
  } else if (doc.docType === 'form') {
     actions.push(
      <Button key="fill-form" variant="default" size="sm" className="mr-2" onClick={() => alert(`${tActions('fillForm')} ${doc.docId} (Not implemented)`)}>
        <FileText className="mr-2 h-4 w-4" /> {tActions('fillForm')}
      </Button>
    );
    actions.push(
      <Button key="view-submissions" variant="outline" size="sm" onClick={() => alert(`${tActions('viewSubmissions')} for ${doc.docId} (Not implemented)`)}>
        <Eye className="mr-2 h-4 w-4" /> {tActions('viewSubmissions')}
      </Button>
    );
  }

  return (
    <TableRow className="hover:bg-muted/10">
      <TableCell className="font-mono text-xs w-1/5">{doc.docId}</TableCell>
      <TableCell className="w-3/5">{doc.title}</TableCell>
      <TableCell className="text-xs w-1/5">{doc.relevantClauses || "N/A"}</TableCell>
      <TableCell className="text-right w-1/5">
        {actions}
      </TableCell>
    </TableRow>
  );
};

export default function RecordsPage() {
  const t = useTranslations('RecordsPage');
  const [recordsByType, setRecordsByType] = useState<Record<QualityDocumentLevel, QualitySystemDocument[]>>({A: [], B: [], C: [], D1: [], D2: []});
  const [isLoading, setIsLoading] = useState(true);
  const [defaultOpenLevels, setDefaultOpenLevels] = useState<string[]>([]);

  const [isAddMaintenanceLogEntryDialogOpen, setIsAddMaintenanceLogEntryDialogOpen] = useState(false);
  const [isAddInterestedPartyDialogOpen, setIsAddInterestedPartyDialogOpen] = useState(false);
  const [isAddRiskAssessmentDialogOpen, setIsAddRiskAssessmentDialogOpen] = useState(false);
  const [currentLogDocId, setCurrentLogDocId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    const groupedData = getDocumentsByLevel();
    setRecordsByType(groupedData);
    const openLevels: string[] = [];
    if (groupedData.D1?.length > 0) openLevels.push('D1');
    if (groupedData.D2?.length > 0) openLevels.push('D2');
    setDefaultOpenLevels(openLevels);
    setIsLoading(false);
  }, []);

  const levelsToShow: QualityDocumentLevel[] = ['D1', 'D2'];

  const handleAddEntryClick = (docId: string) => {
    setCurrentLogDocId(docId);
    if (docId === 'FRM-712-001') {
      setIsAddMaintenanceLogEntryDialogOpen(true);
    } else if (docId === 'FRM-420-001') {
      setIsAddInterestedPartyDialogOpen(true);
    } else if (docId === 'FRM-612-001') {
      setIsAddRiskAssessmentDialogOpen(true);
    } else {
      alert(`${t('actions_addEntry')} for ${docId} (Not implemented for this log type yet)`);
    }
  };

  const handleLogEntryAdded = () => {
    console.log(`Log entry added for ${currentLogDocId}, refresh on respective log page if needed.`);
  };
  
  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('loading_records')} />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <Accordion type="multiple" defaultValue={defaultOpenLevels} className="w-full">
        {(Object.keys(recordsByType) as QualityDocumentLevel[])
          .filter(level => levelsToShow.includes(level) && recordsByType[level]?.length > 0)
          .map((levelKey) => (
            <AccordionItem value={levelKey} key={levelKey}>
              <AccordionTrigger className="text-lg hover:no-underline bg-muted/20 px-4 rounded-t-md">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-6 w-6 text-accent" />
                  {t(`level${levelKey}_title` as any, {defaultMessage: levelTitles[levelKey]})} ({recordsByType[levelKey]?.length || 0} {t('items_count_suffix', { defaultMessage: 'items' })})
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 py-2 space-y-2 border border-t-0 rounded-b-md">
                {recordsByType[levelKey] && recordsByType[levelKey].length > 0 ? (
                   <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('table_recordId')}</TableHead>
                        <TableHead>{t('table_title')}</TableHead>
                        <TableHead>{t('table_clauses')}</TableHead>
                        <TableHead className="text-right">{t('table_actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recordsByType[levelKey].map((doc) => (
                        <RecordRow key={doc.docId} doc={doc} onAddEntryClick={handleAddEntryClick} tActions={(key: string) => t(`actions_${key}` as any)} />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center p-4 text-muted-foreground">
                     <AlertTriangle className="h-5 w-5 mr-2" />
                    {t('no_items_in_category')}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>

      {currentLogDocId === 'FRM-712-001' && (
        <AddMaintenanceLogEntryDialog
          open={isAddMaintenanceLogEntryDialogOpen}
          onOpenChange={setIsAddMaintenanceLogEntryDialogOpen}
          onEntryAdded={handleLogEntryAdded}
        />
      )}
      {currentLogDocId === 'FRM-420-001' && (
        <AddInterestedPartyRegisterEntryDialog
          open={isAddInterestedPartyDialogOpen}
          onOpenChange={setIsAddInterestedPartyDialogOpen}
          onEntryAdded={handleLogEntryAdded}
        />
      )}
      {currentLogDocId === 'FRM-612-001' && (
        <AddRiskAssessmentLogEntryDialog
          open={isAddRiskAssessmentDialogOpen}
          onOpenChange={setIsAddRiskAssessmentDialogOpen}
          onEntryAdded={handleLogEntryAdded}
        />
      )}
    </div>
  );
}
