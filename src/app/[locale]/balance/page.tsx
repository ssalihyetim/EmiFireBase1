
"use client";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Users, Building, DollarSign, TrendingUp, TrendingDown, PlusCircle, FileEdit } from "lucide-react";
import type { BalanceEntry } from "@/types";
import { useTranslations } from "next-intl";

// Mock data will eventually be replaced by Firestore data
const mockClientBalances: BalanceEntry[] = [
  { id: "client1", name: "Acme Corp", totalDue: 15000, totalPaid: 10000, currency: "USD" },
  { id: "client2", name: "Beta Solutions", totalDue: 8500, totalPaid: 8500, currency: "USD" },
  { id: "client3", name: "Gamma Inc", totalDue: 22000, totalPaid: 5000, currency: "EUR" },
];

const mockSupplierBalances: BalanceEntry[] = [
  { id: "sup1", name: "Office Supplies Ltd", totalDue: 500, totalPaid: 300, currency: "USD" },
  { id: "sup2", name: "Cloud Services Inc", totalDue: 1200, totalPaid: 1200, currency: "USD" },
];

function BalanceCard({ entry, t }: { entry: BalanceEntry, t: any }) {
  const currentBalance = entry.totalDue - entry.totalPaid;
  const isOverdue = currentBalance > 0; 
  const Icon = isOverdue ? TrendingDown : TrendingUp; // Not currently used, can be added
  const iconColor = isOverdue ? "text-red-500" : "text-green-500"; // Not currently used

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{entry.name}</span>
          <DollarSign className="h-5 w-5 text-muted-foreground" />
        </CardTitle>
        <CardDescription>
          {isOverdue ? t('card_outstandingBalance') : t('card_settledCredit')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('card_totalDue')}</span>
          <span className="font-semibold">{entry.currency} {entry.totalDue.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">{t('card_totalPaid')}</span>
          <span className="font-semibold">{entry.currency} {entry.totalPaid.toLocaleString()}</span>
        </div>
        <hr className="my-2 border-border" />
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold">{t('card_currentBalance')}</span>
          <span className={`text-lg font-bold ${isOverdue ? 'text-destructive' : 'text-green-600'}`}>
            {entry.currency} {currentBalance.toLocaleString()}
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">
          <FileEdit className="mr-2 h-4 w-4" /> {t('button_viewStatement')}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function BalancePage() {
  const t = useTranslations('BalancePage');
  // In future, clientBalances and supplierBalances would be fetched from Firestore
  const [clientBalances, setClientBalances] = useState<BalanceEntry[]>(mockClientBalances);
  const [supplierBalances, setSupplierBalances] = useState<BalanceEntry[]>(mockSupplierBalances);

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('button_addTransaction')}
          </Button>
        }
      />
      <Tabs defaultValue="clients">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 mb-6">
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> {t('tabs_clientBalances')}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building className="h-4 w-4" /> {t('tabs_supplierBalances')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clients">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clientBalances.map(balance => <BalanceCard key={balance.id} entry={balance} t={t} />)}
            {clientBalances.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">{t('no_client_balances')}</p>}
          </div>
        </TabsContent>
        <TabsContent value="suppliers">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {supplierBalances.map(balance => <BalanceCard key={balance.id} entry={balance} t={t}/>)}
            {supplierBalances.length === 0 && <p className="text-muted-foreground col-span-full text-center py-8">{t('no_supplier_balances')}</p>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
