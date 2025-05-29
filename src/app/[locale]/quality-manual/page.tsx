
"use client";

import * as React from "react";
import { PageHeader } from "@/components/page-header";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, FileText, Download, Eye, AlertTriangle, Loader2 } from "lucide-react";
import type { QualitySystemDocument, QualityDocumentLevel } from "@/types";
import { getDocumentsByLevel, levelTitles, qualitySystemDocuments } from "@/lib/quality-system-data";
import { useTranslations } from "next-intl";

const DocumentRow = ({ doc, tActions }: { doc: QualitySystemDocument, tActions: any }) => {
  return (
    <TableRow className="hover:bg-muted/10">
      <TableCell className="font-mono text-xs w-1/6">{doc.docId}</TableCell>
      <TableCell className="w-3/6">{doc.title}</TableCell>
      <TableCell className="text-xs w-1/6">{doc.relevantClauses || "N/A"}</TableCell>
      <TableCell className="text-right w-1/6">
        <Button variant="ghost" size="icon" title={tActions('view')} onClick={() => alert(`Viewing ${doc.docId}`)} className="mr-1">
          <Eye className="h-4 w-4" />
        </Button>
        {doc.filePath && (
          <a href={doc.filePath} download={`${doc.docId}_placeholder.txt`}>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" /> {tActions('download')}
            </Button>
          </a>
        )}
      </TableCell>
    </TableRow>
  );
};

export default function QualityManualPage() {
  const t = useTranslations('QualityManualPage');
  const [documents, setDocuments] = React.useState<Record<QualityDocumentLevel, QualitySystemDocument[]>>({A: [], B: [], C: [], D1: [], D2: []});
  const [isLoading, setIsLoading] = React.useState(true);
  const [defaultOpenLevels, setDefaultOpenLevels] = React.useState<string[]>([]);

  React.useEffect(() => {
    setIsLoading(true);
    const groupedData = getDocumentsByLevel();
    setDocuments(groupedData);
    const openLevels: string[] = [];
    if (groupedData.A?.length > 0) openLevels.push('A');
    if (groupedData.B?.length > 0) openLevels.push('B');
    setDefaultOpenLevels(openLevels);
    setIsLoading(false);
  }, []);

  const levelsToShow: QualityDocumentLevel[] = ['A', 'B', 'C'];

  if (isLoading) {
    return (
      <div>
        <PageHeader title={t('loading_documents')} />
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
        {(Object.keys(documents) as QualityDocumentLevel[])
          .filter(level => levelsToShow.includes(level) && documents[level]?.length > 0)
          .map((levelKey) => (
          <AccordionItem value={levelKey} key={levelKey}>
            <AccordionTrigger className="text-lg hover:no-underline bg-muted/20 px-4 rounded-t-md">
              <div className="flex items-center gap-2">
                <Folder className="h-6 w-6 text-accent" />
                {t(`level${levelKey}_title` as any, { defaultMessage: levelTitles[levelKey] })} ({documents[levelKey]?.length || 0} {t('documents_count_suffix', { defaultMessage: 'documents' })})
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-2 py-2 space-y-2 border border-t-0 rounded-b-md">
              {documents[levelKey] && documents[levelKey].length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table_docId')}</TableHead>
                      <TableHead>{t('table_title')}</TableHead>
                      <TableHead>{t('table_clauses')}</TableHead>
                      <TableHead className="text-right">{t('table_actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents[levelKey].map((doc) => (
                      <DocumentRow key={doc.docId} doc={doc} tActions={(key: string) => t(`actions_${key}` as any)} />
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  {t('no_documents_in_level')}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
