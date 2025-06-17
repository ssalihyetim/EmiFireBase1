"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2, Wrench } from "lucide-react";
import type { EquipmentMaintenanceLogEntry } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { AddMaintenanceLogEntryDialog } from '@/components/records/equipment-maintenance-log/add-entry-dialog';

const MAINTENANCE_LOG_STORAGE_KEY = "maintenanceLog_FRM-712-001";

export default function EquipmentMaintenanceLogPage() {
  const [logEntries, setLogEntries] = useState<EquipmentMaintenanceLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setIsAddEntryDialogOpen] = useState(false);

  // Ensure component is mounted before accessing localStorage
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchLogEntries = useCallback(() => {
    if (!isMounted) return;
    
    try {
      setIsLoading(true);
      const storedEntriesString = localStorage.getItem(MAINTENANCE_LOG_STORAGE_KEY);
      if (storedEntriesString) {
        const parsedEntries: EquipmentMaintenanceLogEntry[] = JSON.parse(storedEntriesString);
        // Sort by maintenance date, most recent first
        parsedEntries.sort((a, b) => parseISO(b.maintenanceDate).getTime() - parseISO(a.maintenanceDate).getTime());
        setLogEntries(parsedEntries);
      } else {
        setLogEntries([]);
      }
    } catch (error) {
      console.error("Failed to load maintenance log entries from localStorage:", error);
      setLogEntries([]);
      if (isMounted) {
        toast({
          title: "Error Loading Log",
          description: "Could not retrieve maintenance log data.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [toast, isMounted]);

  useEffect(() => {
    if (isMounted) {
      fetchLogEntries();
    }
  }, [fetchLogEntries, isMounted]);

  const handleEntryAdded = () => {
    fetchLogEntries(); // Re-fetch entries after a new one is added
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!isMounted) return;
    
    if (confirm("Are you sure you want to delete this log entry? This action cannot be undone.")) {
      try {
        const updatedEntries = logEntries.filter(entry => entry.id !== entryId);
        localStorage.setItem(MAINTENANCE_LOG_STORAGE_KEY, JSON.stringify(updatedEntries));
        setLogEntries(updatedEntries);
        toast({
          title: "Entry Deleted",
          description: "The maintenance log entry has been deleted.",
        });
      } catch (error) {
        console.error("Failed to delete maintenance log entry:", error);
        toast({
          title: "Error",
          description: "Could not delete the log entry.",
          variant: "destructive",
        });
      }
    }
  };
  
  const formatDateDisplay = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return format(parseISO(dateString), "PP"); // e.g., Sep 21, 2023
    } catch (e) {
      return "Invalid Date";
    }
  };

  // Show loading state while component is mounting
  if (!isMounted || isLoading) {
    return (
      <div>
        <PageHeader
          title="Equipment Maintenance Log (FRM-712-001)"
          description="View and manage all maintenance activities for equipment."
        />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Wrench className="mr-2 h-5 w-5 text-primary" /> Log Entries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading maintenance log...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Equipment Maintenance Log (FRM-712-001)"
        description="View and manage all maintenance activities for equipment."
        actions={
          <Button onClick={() => setIsAddEntryDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Entry
          </Button>
        }
      />
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Wrench className="mr-2 h-5 w-5 text-primary" /> Log Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment ID</TableHead>
                <TableHead>Equipment Name</TableHead>
                <TableHead>Maint. Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)} title="Delete Entry">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete Entry</span>
                    </Button>
                     {/* Add Edit button later if needed */}
                  </TableCell>
                </TableRow>
              ))}
              {logEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-muted-foreground">
                    No maintenance log entries found. Click "Add New Entry" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
