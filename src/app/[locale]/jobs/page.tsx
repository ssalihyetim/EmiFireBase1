
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Order, Job, JobStatus, Attachment, OrderFirestoreData } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Layers, MoreHorizontal, PlayCircle, PauseCircle, CheckCircle2, AlertTriangle, XCircle, ListChecks, Paperclip, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { useTranslations } from "next-intl";

const ORDERS_COLLECTION_NAME = "orders";

const JobStatusIconMap: Record<JobStatus, React.ElementType> = {
  Pending: AlertTriangle,
  "In Progress": PlayCircle,
  "Awaiting Next Process": PauseCircle,
  Completed: CheckCircle2,
  "On Hold": PauseCircle,
  Blocked: XCircle,
};

function JobStatusBadge({ status }: { status: JobStatus }) {
  const Icon = JobStatusIconMap[status] || AlertTriangle;
  const colorClasses: Record<JobStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-300",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-300",
    "Awaiting Next Process": "bg-orange-100 text-orange-700 border-orange-300",
    Completed: "bg-green-100 text-green-700 border-green-300", // Corrected color for better visibility
    "On Hold": "bg-gray-100 text-gray-700 border-gray-300",
    Blocked: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <Badge variant="outline" className={`capitalize ${colorClasses[status] || "bg-gray-200 text-gray-800 border-gray-400"}`}>
      <Icon className={`h-3 w-3 mr-1 ${status === 'In Progress' ? 'animate-pulse' : ''}`} />
      {status}
    </Badge>
  );
}

function AssignedProcessesList({ processes }: { processes?: string[] }) {
  if (!processes || processes.length === 0) {
    return <span className="text-xs text-muted-foreground">N/A</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {processes.map((process, idx) => (
        <Badge key={idx} variant="secondary" className="text-xs">{process}</Badge>
      ))}
    </div>
  );
}

function AttachmentsList({ attachments }: { attachments?: Attachment[] }) {
  if (!attachments || attachments.length === 0) {
    return <span className="text-xs text-muted-foreground">None</span>;
  }
  return (
    <div className="flex flex-col gap-0.5">
      {attachments.map((attachment, idx) => (
        <div key={idx} className="flex items-center text-xs">
          <Paperclip className="h-3 w-3 mr-1 text-muted-foreground" />
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{attachment.name}</a>
        </div>
      ))}
    </div>
  );
}

export default function JobsPage() {
  const t = useTranslations('JobsPage');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchActiveOrderItemsAsJobs = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, ORDERS_COLLECTION_NAME),
        where("status", "in", ["New", "Processing"]) 
      );
      const querySnapshot = await getDocs(q);
      const allJobs: Job[] = [];
      querySnapshot.forEach((docSnap) => {
        const orderData = docSnap.data() as OrderFirestoreData; 
        orderData.items.forEach((item, itemIndex) => {
          allJobs.push({
            id: `${docSnap.id}-item-${item.id || itemIndex}`,
            orderId: docSnap.id,
            orderNumber: orderData.orderNumber,
            clientName: orderData.clientName,
            item: {
              ...item,
              rawMaterialType: item.rawMaterialType || '',
              rawMaterialDimension: item.rawMaterialDimension || '',
              assignedProcesses: item.assignedProcesses || [],
              attachments: item.attachments || [],
            },
            status: "Pending", // Default status for new jobs
          });
        });
      });
      setJobs(allJobs);
    } catch (error) {
      console.error("Failed to load jobs from Firestore orders:", error);
      setJobs([]);
      toast({
        title: t('error_loading_jobs_toast_title'), // Example: Add to messages
        description: "Could not retrieve job data from Firestore.", // Example: Add to messages
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchActiveOrderItemsAsJobs();
  }, [fetchActiveOrderItemsAsJobs]);

  const handleUpdateJobStatus = (jobId: string, newStatus: JobStatus) => {
    // This would eventually update Firestore, for now just a toast
    toast({
      title: "Update Job Status (Not Implemented)",
      description: `Changing status for job ${jobId} to ${newStatus}.`,
    });
     // Example of how you might update local state:
    // setJobs(prevJobs => prevJobs.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
  };


  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button variant="outline">
            <ListChecks className="mr-2 h-4 w-4" /> {t('button_viewProcessBoard')}
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Layers className="mr-2 h-5 w-5 text-primary" /> {t('currentJobsTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">{t('loading_jobs')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table_jobId')}</TableHead>
                  <TableHead>{t('table_orderNumber')}</TableHead>
                  <TableHead>{t('table_client')}</TableHead>
                  <TableHead>{t('table_partName')}</TableHead>
                  <TableHead>{t('table_material')}</TableHead>
                  <TableHead>{t('table_dimensions')}</TableHead>
                  <TableHead className="text-center">{t('table_qty')}</TableHead>
                  <TableHead>{t('table_processes')}</TableHead>
                  <TableHead>{t('table_attachments')}</TableHead>
                  <TableHead>{t('table_status')}</TableHead>
                  <TableHead className="text-right">{t('table_actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/10">
                    <TableCell className="font-mono text-xs">{job.id}</TableCell>
                    <TableCell className="font-medium">{job.orderNumber}</TableCell>
                    <TableCell>{job.clientName}</TableCell>
                    <TableCell>{job.item.partName}</TableCell>
                    <TableCell>{job.item.rawMaterialType || t('na', {defaultMessage:'N/A'})}</TableCell>
                    <TableCell>{job.item.rawMaterialDimension || t('na', {defaultMessage:'N/A'})}</TableCell>
                    <TableCell className="text-center">{job.item.quantity}</TableCell>
                    <TableCell>
                      <AssignedProcessesList processes={job.item.assignedProcesses} />
                    </TableCell>
                    <TableCell>
                      <AttachmentsList attachments={job.item.attachments} />
                    </TableCell>
                    <TableCell>
                      <JobStatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => alert(`Actions for job ${job.id}`)}>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t('table_actions')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {jobs.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center h-24 text-muted-foreground">
                      {t('no_active_jobs_found')}
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
