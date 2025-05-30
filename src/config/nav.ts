import type { NavItem } from "@/types";
import {
  LayoutDashboard,
  BookCopy,
  ListChecks, 
  Briefcase,
  ShoppingCart,
  PackageCheck,
  Scale,
  Layers,
  TestTube,
  Shield,
  Factory,
  FileText,
  Wrench,
} from "lucide-react";

// Titles are now translation keys, e.g., "Navigation.dashboard"
export const navItems: NavItem[] = [
  {
    title: "dashboard", // Key for translation
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "qualityManual", // Key for translation
    href: "/quality-manual",
    icon: BookCopy,
  },
  {
    title: "recordsForms", // Key for translation
    href: "/records",
    icon: ListChecks, 
  },
  {
    title: "offers", // Key for translation
    href: "/offers",
    icon: Briefcase,
  },
  {
    title: "orders", // Key for translation
    href: "/orders", // Base path for orders, actual links are sub-items
    icon: ShoppingCart,
    items: [
      {
        title: "activeOrders", // Key for translation
        href: "/orders/active",
        icon: ShoppingCart,
      },
      {
        title: "sentOrders", // Key for translation
        href: "/orders/sent",
        icon: PackageCheck,
      },
    ],
  },
  {
    title: "jobs", // Key for translation
    href: "/jobs",
    icon: Layers,
  },
  {
    title: "balanceTracking", // Key for translation
    href: "/balance",
    icon: Scale,
  },
  {
    title: "testAutomation", // Development only
    href: "/test-automation",
    icon: TestTube,
    label: "DEV",
  },
  {
    title: "qualityAudit",
    href: "/quality-audit",
    icon: Shield,
  },
  {
    title: "manufacturing",
    href: "/manufacturing",
    icon: Factory,
    items: [
      {
        title: "tools",
        href: "/manufacturing/tools",
        icon: Wrench,
      }
    ],
  },
];
