
"use client";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { navItems } from "@/config/nav";
import { SidebarNav } from "./sidebar-nav";
import { HeaderNav } from "./header-nav";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useTranslations } from "next-intl";


interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations('AppShell');
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon" variant="sidebar" side="left" className="border-r">
          <SidebarHeader className="p-4">
            <Link href="/" className="flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-sidebar-primary">
                 <path d="M12 .998c-1.33.001-2.4.967-2.4 2.16v.003c0 1.192 1.072 2.158 2.4 2.16 1.33-.002 2.4-.968 2.4-2.16V3.16c0-1.193-1.07-2.159-2.4-2.162zm5.143 3.414c-.475.618-1.218.99-2.035.99-.603 0-1.158-.238-1.584-.627A2.39 2.39 0 0 1 12.36 3.16v-.003a2.398 2.398 0 0 1-1.163 1.616c-.426.39-1.004.628-1.584.627-.817 0-1.56-.372-2.035-.99A2.894 2.894 0 0 1 6.71 3.16a2.898 2.898 0 0 1 4.132-1.204 2.9 2.9 0 0 1 2.318 0A2.898 2.898 0 0 1 17.29 3.16c0 .82-.39 1.565-.847 2.252zM6.343 6.857A2.4 2.4 0 0 1 7.505 6c.817 0 1.56.372 2.035.99.426.389.981.627 1.584.627s1.135-.238 1.584-.627c.475-.618 1.218-.99 2.035-.99.622 0 1.18.25 1.585.657H21.6c.825 0 1.2.826 1.2 1.65v12.9c0 .825-.375 1.65-1.2 1.65H2.4c-.825 0-1.2-.825-1.2-1.65V8.307c0-.824.375-1.65 1.2-1.65h2.743a2.39 2.39 0 0 1 1.163.857c.426.39.981.627 1.584.627s1.135-.238 1.584-.627c.475-.618 1.218-.99 2.035-.99.603 0 1.158-.238 1.584.627.475.618 1.218-.99 2.035.99.532 0 1.004-.165 1.415-.442V21.6H4.8V9.6h-.25a.15.15 0 0 0-.15.15v11.7c0 .083.067.15.15.15H19.2a.15.15 0 0 0 .15-.15V9.75a.15.15 0 0 0-.15-.15H12v10.2h-2.4V9.6H7.2v12H4.8v-9.6H2.4V21.6h19.2V8.307c0-.082-.067-.15-.15-.15H16.8v1.2h-2.4V7.915c.41.277.883.442 1.415.442.817 0 1.56-.372 2.035-.99.426-.389.981.627 1.584-.627s1.135-.238 1.584-.627c.255-.24.472-.51.643-.808z"/>
               </svg>
              <span className="text-2xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">Euro Metal Docs</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarNav items={navItems} />
          </SidebarContent>
          <SidebarFooter className="p-2 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center">
             <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square">
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden ml-2">{t('logout')}</span>
             </Button>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <HeaderNav />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <Toaster />
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

    