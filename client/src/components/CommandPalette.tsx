import { useEffect, useState, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Users,
  FileText,
  LayoutTemplate,
  ClipboardList,
  BarChart3,
  Calendar,
  Webhook,
  Bell,
  Settings,
  Search,
  Layers,
  Shield,
  GitCompare,
  Target,
  UserPlus,
  Zap,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", path: "/", icon: BarChart3, group: "Navigation" },
  { name: "Clients", path: "/clients", icon: Users, group: "Navigation" },
  { name: "Content", path: "/content", icon: FileText, group: "Navigation" },
  { name: "Bulk Generation", path: "/bulk-generation", icon: Layers, group: "Navigation" },
  { name: "Scheduling", path: "/scheduling", icon: Calendar, group: "Navigation" },
  { name: "Templates", path: "/templates", icon: LayoutTemplate, group: "Navigation" },
  { name: "Collaboration", path: "/collaboration", icon: ClipboardList, group: "Navigation" },
  { name: "Version History", path: "/version-history", icon: GitCompare, group: "Navigation" },
  { name: "Quality Score", path: "/quality-score", icon: Shield, group: "Navigation" },
  { name: "SEO Audit", path: "/seo-audit", icon: Target, group: "Navigation" },
  { name: "Analytics", path: "/analytics", icon: BarChart3, group: "Navigation" },
  { name: "Repurposing", path: "/repurposing", icon: Zap, group: "Navigation" },
  { name: "Publishing", path: "/publishing", icon: Webhook, group: "Navigation" },
  { name: "Briefs", path: "/briefs", icon: ClipboardList, group: "Navigation" },
  { name: "Notifications", path: "/notifications", icon: Bell, group: "Navigation" },
  { name: "Client Onboarding", path: "/onboarding", icon: UserPlus, group: "Navigation" },
  { name: "Client Portal", path: "/client-portal", icon: Users, group: "Navigation" },
  { name: "Reports", path: "/reports", icon: BarChart3, group: "Navigation" },
  { name: "Settings", path: "/settings", icon: Settings, group: "Navigation" },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: clientsList } = trpc.clients.list.useQuery(undefined, { enabled: open });
  const { data: contentList } = trpc.content.list.useQuery(undefined, { enabled: open });
  const { data: templatesList } = trpc.templates.list.useQuery(undefined, { enabled: open });

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const clientItems = useMemo(
    () =>
      clientsList?.map((c) => ({
        name: c.name,
        description: c.industry || c.company || "",
        path: `/clients/${c.id}`,
        icon: Users,
      })) || [],
    [clientsList]
  );

  const contentItems = useMemo(
    () =>
      contentList?.map((item) => ({
        name: item.content.title,
        description: `${item.content.status} • ${item.client?.name || "No client"}`,
        path: `/content/${item.content.id}`,
        icon: FileText,
      })) || [],
    [contentList]
  );

  const templateItems = useMemo(
    () =>
      templatesList?.map((t) => ({
        name: t.name,
        description: t.category || "",
        path: "/templates",
        icon: LayoutTemplate,
      })) || [],
    [templatesList]
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, clients, content, templates..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              value={`page-${item.name}`}
              onSelect={() => handleSelect(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{item.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {clientItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clients">
              {clientItems.map((item) => (
                <CommandItem
                  key={item.path}
                  value={`client-${item.name}`}
                  onSelect={() => handleSelect(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {contentItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Content">
              {contentItems.slice(0, 10).map((item, idx) => (
                <CommandItem
                  key={`${item.path}-${idx}`}
                  value={`content-${item.name}`}
                  onSelect={() => handleSelect(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {templateItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Templates">
              {templateItems.map((item, idx) => (
                <CommandItem
                  key={`template-${idx}`}
                  value={`template-${item.name}`}
                  onSelect={() => handleSelect(item.path)}
                  className="cursor-pointer"
                >
                  <item.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
      <div className="border-t border-border p-2 text-xs text-muted-foreground text-center">
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd> Navigate{" "}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↵</kbd> Select{" "}
        <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close
      </div>
    </CommandDialog>
  );
}
