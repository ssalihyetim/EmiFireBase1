
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {Link} from '@/navigation'; // Use next-intl's Link
import { ArrowRight, Briefcase, ListChecks, Scale, ShoppingCart } from "lucide-react";
import {getTranslations} from 'next-intl/server';

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  link: string;
  linkText: string;
  color?: string;
}

function SummaryCard({ title, value, icon: Icon, link, linkText, color = "text-primary" }: SummaryCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <Button variant="link" asChild className="px-0 pt-2 text-sm text-accent">
          <Link href={link}>
            {linkText}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const t = await getTranslations('DashboardPage');

  const summaryData = [
    { title: "Active Offers", value: "0", icon: Briefcase, link: "/offers", linkText: "View Offers", color: "text-blue-500" },
    { title: "Pending Orders", value: "5", icon: ShoppingCart, link: "/orders/active", linkText: "Manage Orders", color: "text-orange-500" },
    { title: "Tasks To Complete", value: "8", icon: ListChecks, link: "/records", linkText: "View Records", color: "text-green-500" },
    { title: "Client Balances", value: "$5,230", icon: Scale, link: "/balance", linkText: "Track Balances", color: "text-purple-500" },
  ];

  return (
    <div className="container mx-auto">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryData.map((data) => (
          <SummaryCard key={data.title} {...data} />
        ))}
      </div>

      <div className="mt-12">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              <li className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <div>
                  <p className="font-medium">New offer #OFF-00125 created</p>
                  <p className="text-sm text-muted-foreground">Client: Acme Corp</p>
                </div>
                <span className="text-xs text-muted-foreground">2 hours ago</span>
              </li>
              <li className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <div>
                  <p className="font-medium">Order #ORD-0087 processed</p>
                  <p className="text-sm text-muted-foreground">Status: Shipped</p>
                </div>
                <span className="text-xs text-muted-foreground">1 day ago</span>
              </li>
              <li className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <div>
                  <p className="font-medium">Document "QM-B-003" updated</p>
                  <p className="text-sm text-muted-foreground">Quality Manual</p>
                </div>
                <span className="text-xs text-muted-foreground">3 days ago</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
