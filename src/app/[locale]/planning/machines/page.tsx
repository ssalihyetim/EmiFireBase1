"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Settings, Wrench, Activity } from "lucide-react";
import type { Machine, MachineType, MachineFirestore } from "@/types/planning";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, writeBatch, doc, serverTimestamp } from "firebase/firestore";

const MACHINES_COLLECTION = "machines";

// Initial machine data as per your requirements
const initialMachines: Omit<MachineFirestore, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Turning machines
  { 
    name: "NEX110", 
    type: "turning", 
    model: "NEX110", 
    isActive: true, 
    capabilities: ["turning", "threading", "grooving"],
    hourlyRate: 45
  },
  { 
    name: "TNC2000", 
    type: "turning", 
    model: "TNC2000", 
    isActive: true, 
    capabilities: ["turning", "threading", "live-tooling"],
    hourlyRate: 50
  },
  
  // Milling machines
  { 
    name: "AWEA", 
    type: "milling", 
    model: "AWEA VP-1000", 
    isActive: true, 
    capabilities: ["3-axis-milling", "drilling", "tapping"],
    hourlyRate: 55
  },
  { 
    name: "Sunmill", 
    type: "milling", 
    model: "Sunmill VMC-800", 
    isActive: true, 
    capabilities: ["3-axis-milling", "high-speed"],
    hourlyRate: 52
  },
  { 
    name: "Spinner MVC", 
    type: "milling", 
    model: "Spinner MVC 1000", 
    isActive: true, 
    capabilities: ["3-axis-milling", "heavy-duty"],
    hourlyRate: 58
  },
  { 
    name: "Quaser MV154", 
    type: "milling", 
    model: "Quaser MV154", 
    isActive: true, 
    capabilities: ["3-axis-milling", "precision"],
    hourlyRate: 60
  },
  
  // 5-axis machines
  { 
    name: "Fanuc Robodrill", 
    type: "5-axis", 
    model: "Fanuc Robodrill α-D21MiA5", 
    isActive: true, 
    capabilities: ["5-axis-milling", "high-speed", "complex-geometry"],
    hourlyRate: 85
  },
  { 
    name: "Matsuura", 
    type: "5-axis", 
    model: "Matsuura MX-520", 
    isActive: true, 
    capabilities: ["5-axis-milling", "precision", "complex-geometry"],
    hourlyRate: 90
  },
  { 
    name: "Spinner U1520", 
    type: "5-axis", 
    model: "Spinner U1520", 
    isActive: true, 
    capabilities: ["5-axis-milling", "large-parts", "complex-geometry"],
    hourlyRate: 95
  }
];

const machineTypeColors: Record<MachineType, string> = {
  turning: "bg-blue-100 text-blue-700 border-blue-300",
  milling: "bg-green-100 text-green-700 border-green-300",
  "5-axis": "bg-purple-100 text-purple-700 border-purple-300"
};

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const seedMachines = async () => {
    const batch = writeBatch(db);
    const machinesCol = collection(db, MACHINES_COLLECTION);

    initialMachines.forEach(machine => {
      const newMachineRef = doc(machinesCol);
      batch.set(newMachineRef, machine);
    });

    try {
      await batch.commit();
      toast({
        title: "Machines Added",
        description: "Initial machine configuration has been set up.",
      });
      return true;
    } catch (error) {
      console.error("Error seeding machines:", error);
      toast({
        title: "Error",
        description: "Failed to set up machines.",
        variant: "destructive",
      });
      return false;
    }
  };

  const fetchMachines = async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, MACHINES_COLLECTION));
      
      if (querySnapshot.empty) {
        await seedMachines();
        // Refetch after seeding
        const refetchSnapshot = await getDocs(collection(db, MACHINES_COLLECTION));
        const fetchedMachines: Machine[] = refetchSnapshot.docs.map(doc => {
          const data = doc.data() as MachineFirestore;
          return {
            id: doc.id,
            name: data.name,
            type: data.type,
            model: data.model,
            isActive: data.isActive,
            capabilities: data.capabilities,
            hourlyRate: data.hourlyRate,
            maintenanceSchedule: data.maintenanceSchedule,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
          } as Machine;
        });
        setMachines(fetchedMachines);
      } else {
        const fetchedMachines: Machine[] = querySnapshot.docs.map(doc => {
          const data = doc.data() as MachineFirestore;
          return {
            id: doc.id,
            name: data.name,
            type: data.type,
            model: data.model,
            isActive: data.isActive,
            capabilities: data.capabilities,
            hourlyRate: data.hourlyRate,
            maintenanceSchedule: data.maintenanceSchedule,
            createdAt: data.createdAt?.toDate().toISOString(),
            updatedAt: data.updatedAt?.toDate().toISOString(),
          } as Machine;
        });
        setMachines(fetchedMachines);
      }
    } catch (error) {
      console.error("Error fetching machines:", error);
      toast({
        title: "Error",
        description: "Failed to load machines.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  return (
    <div>
      <PageHeader
        title="Machine Management"
        description="Manage your CNC machines and their capabilities"
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Machine
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {(['turning', 'milling', '5-axis'] as MachineType[]).map(type => {
          const machinesOfType = machines.filter(m => m.type === type);
          const activeMachines = machinesOfType.filter(m => m.isActive);
          
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={machineTypeColors[type]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Badge>
                  Machines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeMachines.length}</div>
                <div className="text-sm text-muted-foreground">
                  {activeMachines.length} active of {machinesOfType.length} total
                </div>
                {activeMachines.length > 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg. rate: €{Math.round(activeMachines.reduce((sum, m) => sum + (m.hourlyRate || 0), 0) / activeMachines.length)}/hr
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            All Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <div className="text-muted-foreground">Loading machines...</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.map((machine) => (
                  <TableRow key={machine.id}>
                    <TableCell className="font-medium">{machine.name}</TableCell>
                    <TableCell>
                      <Badge className={machineTypeColors[machine.type]}>
                        {machine.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{machine.model}</TableCell>
                    <TableCell>
                      <Badge variant={machine.isActive ? "default" : "secondary"}>
                        {machine.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {machine.hourlyRate ? `€${machine.hourlyRate}/hr` : 'Not set'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {machine.capabilities?.map((cap, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Wrench className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Machine Capabilities Overview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Capability Matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(
              machines.reduce((acc, machine) => {
                machine.capabilities?.forEach(cap => {
                  if (!acc[cap]) acc[cap] = [];
                  acc[cap].push({ id: machine.id, name: machine.name });
                });
                return acc;
              }, {} as Record<string, Array<{ id: string; name: string }>>)
            ).map(([capability, machineList]) => (
              <div key={capability} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium capitalize">{capability.replace('-', ' ')}</div>
                  <div className="text-sm text-muted-foreground">
                    {machineList.length} machine{machineList.length !== 1 ? 's' : ''} available
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {machineList.map(machine => (
                    <Badge key={`${capability}-${machine.id}`} variant="secondary" className="text-xs">
                      {machine.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 