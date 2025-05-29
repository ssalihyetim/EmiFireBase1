"use client";

import { usePathname, useRouter } from "@/navigation";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem, // Added SidebarMenuSubItem
  useSidebar,
} from "@/components/ui/sidebar";
import type { NavItem } from "@/types";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import {i18n} from '@/i18n.config';

interface SidebarNavProps {
  items: NavItem[];
}

export function SidebarNav({ items }: SidebarNavProps) {
  const currentPathname = usePathname() || "";
  const { open: sidebarOpen } = useSidebar();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('Navigation');

  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!sidebarOpen) {
      setOpenMenus({});
    } else {
      const newOpenMenus: Record<string, boolean> = {};
      if (!Array.isArray(items) || items.length === 0) {
        setOpenMenus(newOpenMenus);
        return;
      }
      items.forEach(item => {
        if (!item || typeof item.href !== 'string') return;
        // For determining active state, we compare against the pathname without locale prefix.
        // `currentPathname` from `next-intl/navigation` already provides this.
        const itemPath = item.href;

        if (item.items && item.items.some(subItem => {
          if (!subItem || typeof subItem.href !== 'string') return false;
          const subItemPath = subItem.href;
          // Check if currentPathname (without locale) matches subItemPath or starts with it (for dynamic routes)
          return currentPathname === subItemPath || currentPathname.startsWith(subItemPath + '/');
        })) {
          newOpenMenus[item.href] = true;
        } else if (isActive(item.href, item.href === '/', currentPathname)) {
          if (item.items && item.items.length > 0) {
            newOpenMenus[item.href] = true;
          }
        }
      });
      setOpenMenus(newOpenMenus);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sidebarOpen, items, currentPathname]);


  const toggleMenu = (href: string) => {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const handleNavigation = (href: string) => {
    router.push(href as any); // Type assertion since we know these are valid navigation paths from our config
  };

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  // isActive now only takes the href and currentPathname (which is already locale-stripped by next-intl's usePathname)
  const isActive = (href: string, isHome: boolean = false, currentPath: string) => {
    if (!currentPath) return false;
    if (isHome) {
      // For home, currentPathname from next-intl for '/' will be '/' itself, not empty.
      return currentPath === '/';
    }
    return currentPath === href || currentPath.startsWith(href + '/');
  };


  return (
    <SidebarMenu>
      {items.map((item) => {
        if (!item || typeof item.href !== 'string') return null;
        const Icon = item.icon;
        // Pass currentPathname (locale-stripped) for active check
        const itemIsActive = isActive(item.href, item.href === '/', currentPathname);
        const isSubmenuOpen = openMenus[item.href] ?? false;

        let translatedTitle = item.title;
        try {
          translatedTitle = t(item.title as any);
        } catch (e) {
          console.warn(`[SidebarNav] Missing translation for navigation key: ${item.title}`);
        }


        if (item.items && item.items.length > 0) {
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                onClick={() => toggleMenu(item.href)}
                // Check active state against sub-items as well
                isActive={itemIsActive && !item.items.some(sub => sub && typeof sub.href === 'string' && isActive(sub.href, false, currentPathname))}
                tooltip={{ children: translatedTitle, hidden: sidebarOpen }}
                className="justify-between"
                aria-expanded={isSubmenuOpen}
              >
                <div className="flex items-center gap-2">
                  <Icon />
                  <span>{translatedTitle}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isSubmenuOpen && "rotate-180")} />
              </SidebarMenuButton>
              {isSubmenuOpen && sidebarOpen && (
                <SidebarMenuSub>
                  {item.items.map((subItem) => {
                    if (!subItem || typeof subItem.href !== 'string') return null;
                    const SubIcon = subItem.icon;
                    const isSubActive = isActive(subItem.href, false, currentPathname);

                    let translatedSubTitle = subItem.title;
                    try {
                      translatedSubTitle = t(subItem.title as any);
                    } catch (e) {
                       console.warn(`[SidebarNav] Missing translation for navigation sub-key: ${subItem.title}`);
                    }

                    return (
                      <SidebarMenuSubItem key={subItem.href}>
                        <SidebarMenuSubButton 
                          isActive={isSubActive}
                          onClick={() => handleNavigation(subItem.href)}
                        >
                          <SubIcon />
                          <span>{translatedSubTitle}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
                </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={itemIsActive}
              tooltip={{ children: translatedTitle, hidden: sidebarOpen }}
              onClick={() => handleNavigation(item.href)}
            >
              <Icon />
              <span>{translatedTitle}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
