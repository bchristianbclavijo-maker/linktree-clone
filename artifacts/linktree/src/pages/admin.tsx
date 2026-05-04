import React, { useState, useEffect, useRef } from "react";
import { useGetLinktreeData, getGetLinktreeDataQueryKey, useSaveLinktreeData } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, GripVertical, Trash2, LogOut, BarChart3, Save, Upload, Palette, QrCode, Download } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import type { LinkItem, Profile, Design } from "@workspace/api-zod/src/generated/types";
import { useUpload } from "@workspace/object-storage-web";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const DEFAULT_DESIGN: Design = {
  bgColor: "#0a0a0a",
  glowColor: "#cc0000",
  glowOpacity: 0.55,
  accentColor: "#cc0000",
  textColor: "#ffffff",
};

function getPhotoSrc(photo: string) {
  if (!photo) return "";
  if (photo.startsWith("/objects/")) return `/api/storage${photo}`;
  return photo;
}

function PhotoUploader({ photo, onPhotoChange }: { photo: string; onPhotoChange: (val: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useUpload({
    onSuccess: (response) => {
      onPhotoChange(response.objectPath);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3">
      <Label>Profile Photo</Label>
      <div className="flex items-center gap-4">
        <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 bg-secondary/50 flex-shrink-0">
          {photo ? (
            <img src={getPhotoSrc(photo)} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs text-center px-1">No photo</div>
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs text-white font-mono">
              {progress}%
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 flex-1">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? `Uploading ${progress}%...` : "Upload Photo"}
          </Button>
          <Input
            value={photo.startsWith("/objects/") ? "" : photo}
            onChange={e => onPhotoChange(e.target.value)}
            className="h-8 bg-background text-xs"
            placeholder="Or paste image URL"
          />
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

function DesignPanel({ design, onChange }: { design: Design; onChange: (d: Design) => void }) {
  const field = (key: keyof Design, label: string, type: "color" | "number" = "color") => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {type === "color" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design[key] as string}
            onChange={e => onChange({ ...design, [key]: e.target.value })}
            className="w-10 h-9 rounded cursor-pointer border border-white/10 bg-transparent p-0.5"
          />
          <Input
            value={design[key] as string}
            onChange={e => onChange({ ...design, [key]: e.target.value })}
            className="h-9 bg-background font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={design[key] as number}
            onChange={e => onChange({ ...design, [key]: parseFloat(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="text-sm font-mono w-10 text-right text-muted-foreground">
            {((design[key] as number) * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {field("bgColor", "Background Color")}
      {field("accentColor", "Accent Color")}
      {field("glowColor", "Glow Color")}
      {field("textColor", "Text Color")}
      <div className="sm:col-span-2">
        {field("glowOpacity", "Glow Intensity", "number")}
      </div>
    </div>
  );
}

function QRCodeCard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const publicUrl = typeof window !== "undefined" ? window.location.origin : "";

  const handleDownload = () => {
    const canvas = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;

    const padded = document.createElement("canvas");
    const padding = 24;
    padded.width = canvas.width + padding * 2;
    padded.height = canvas.height + padding * 2;
    const ctx = padded.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, padded.width, padded.height);
    ctx.drawImage(canvas, padding, padding);

    const a = document.createElement("a");
    a.download = "qr-code.png";
    a.href = padded.toDataURL("image/png");
    a.click();
  };

  return (
    <Card className="border-white/5 bg-secondary/20 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <CardTitle className="font-display">QR Code</CardTitle>
        </div>
        <CardDescription>Share your profile page — scan to open instantly</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div ref={containerRef} className="p-4 rounded-xl bg-white flex-shrink-0">
            <QRCodeCanvas
              value={publicUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#0a0a0a"
              level="H"
            />
          </div>
          <div className="flex flex-col gap-3 flex-1 text-center sm:text-left">
            <div>
              <p className="text-sm font-medium mb-1">Your public URL</p>
              <p className="text-xs text-muted-foreground font-mono break-all bg-background px-3 py-2 rounded-lg border border-white/5">
                {publicUrl}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="secondary" size="sm" onClick={handleDownload} className="font-bold">
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="font-bold"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                }}
              >
                Copy Link
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortableLinkRow({ link, clicks, onUpdate, onRemove }: {
  link: LinkItem;
  clicks: number;
  onUpdate: (id: string, field: keyof LinkItem, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`border-white/5 bg-secondary/20 relative group transition-colors ${isDragging ? "border-primary/40 shadow-lg shadow-primary/10" : "hover:border-white/20"}`}>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
          <button
            className="text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="w-5 h-5" />
          </button>

          <div className="flex-1 grid grid-cols-12 gap-3 w-full">
            <div className="col-span-12 md:col-span-3 space-y-1">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input value={link.label} onChange={e => onUpdate(link.id, "label", e.target.value)} className="h-9 bg-background" placeholder="My Website" />
            </div>
            <div className="col-span-12 md:col-span-6 space-y-1">
              <Label className="text-xs text-muted-foreground">URL</Label>
              <Input value={link.url} onChange={e => onUpdate(link.id, "url", e.target.value)} className="h-9 bg-background" placeholder="https://" />
            </div>
            <div className="col-span-6 md:col-span-3 space-y-1">
              <Label className="text-xs text-muted-foreground">Emoji (Opt)</Label>
              <Input value={link.emoji} onChange={e => onUpdate(link.id, "emoji", e.target.value)} className="h-9 bg-background" placeholder="✨" />
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto md:flex-col gap-3 border-t md:border-t-0 md:border-l border-white/10 pt-3 md:pt-0 md:pl-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
              <BarChart3 className="w-4 h-4 text-primary" />
              {clicks} hits
            </div>
            <Button variant="ghost" size="icon" onClick={() => onRemove(link.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (localStorage.getItem("admin_auth") === "true") setIsAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "admin123") {
      localStorage.setItem("admin_auth", "true");
      setIsAuthenticated(true);
      toast({ title: "Logged in successfully" });
    } else {
      toast({ title: "Invalid password", variant: "destructive" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_auth");
    setIsAuthenticated(false);
    setPassword("");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background bg-grid-pattern p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-2xl shadow-primary/5">
          <CardHeader className="text-center space-y-2">
            <div className="w-12 h-12 bg-primary rounded-xl mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <CardTitle className="font-display text-2xl">Admin Access</CardTitle>
            <CardDescription>Enter password to manage your links</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-secondary/50 border-white/10" />
              </div>
              <Button type="submit" className="w-full font-bold">Access Dashboard</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const { data, isLoading } = useGetLinktreeData({ query: { queryKey: getGetLinktreeDataQueryKey() } });
  const saveMutation = useSaveLinktreeData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState<Profile>({ photo: "", name: "", description: "" });
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const initRef = useRef(false);

  useEffect(() => {
    if (data && !initRef.current) {
      setProfile(data.profile);
      setDesign(data.design ?? DEFAULT_DESIGN);
      setLinks([...data.links].sort((a, b) => a.order - b.order));
      initRef.current = true;
    }
  }, [data]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLinks(prev => {
      const oldIndex = prev.findIndex(l => l.id === active.id);
      const newIndex = prev.findIndex(l => l.id === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((l, i) => ({ ...l, order: i }));
    });
  };

  const handleSave = () => {
    saveMutation.mutate(
      { data: { profile, links, design } },
      {
        onSuccess: () => {
          toast({ title: "Changes saved successfully" });
          queryClient.invalidateQueries({ queryKey: getGetLinktreeDataQueryKey() });
        },
        onError: () => {
          toast({ title: "Failed to save changes", variant: "destructive" });
        },
      }
    );
  };

  const addLink = () => {
    setLinks(prev => [...prev, { id: crypto.randomUUID(), label: "", url: "", emoji: "", order: prev.length }]);
  };

  const removeLink = (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id).map((l, i) => ({ ...l, order: i })));
  };

  const updateLink = (id: string, field: keyof LinkItem, value: string) => {
    setLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  if (isLoading) {
    return <div className="p-8"><Skeleton className="h-96 w-full max-w-4xl mx-auto rounded-xl" /></div>;
  }

  return (
    <div className="min-h-[100dvh] bg-background bg-grid-pattern pb-20">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-xl">
            <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
            Dashboard
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="font-bold">
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Profile */}
        <Card className="border-white/5 bg-secondary/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="font-display">Profile Settings</CardTitle>
            <CardDescription>Update your public facing information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <PhotoUploader photo={profile.photo} onPhotoChange={val => setProfile(p => ({ ...p, photo: val }))} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Display Name</Label>
                <Input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} className="bg-background" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={profile.description} onChange={e => setProfile({ ...profile, description: e.target.value })} className="resize-none bg-background h-24" />
            </div>
          </CardContent>
        </Card>

        {/* Design */}
        <Card className="border-white/5 bg-secondary/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              <CardTitle className="font-display">Design</CardTitle>
            </div>
            <CardDescription>Customize your page colors and visual style</CardDescription>
          </CardHeader>
          <CardContent>
            <DesignPanel design={design} onChange={setDesign} />
            <div className="mt-4 p-3 rounded-lg border border-white/5 flex items-center gap-3 text-sm text-muted-foreground" style={{ backgroundColor: design.bgColor }}>
              <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: design.accentColor }}></span>
              <span style={{ color: design.textColor, opacity: 0.7 }}>Preview — this is how your page colors will look</span>
              <span className="ml-auto px-3 py-1 rounded-md font-medium text-xs" style={{ backgroundColor: design.accentColor, color: "#fff" }}>Button</span>
            </div>
          </CardContent>
        </Card>

        {/* QR Code */}
        <QRCodeCard />

        {/* Links */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold">Links</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Drag the grip handle to reorder</p>
          </div>
          <Button onClick={addLink} variant="secondary" className="font-bold">
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {links.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-xl text-muted-foreground">
                  No links added yet. Click "Add Link" to get started.
                </div>
              ) : (
                links.map((link, index) => (
                  <SortableLinkRow
                    key={link.id}
                    link={link}
                    clicks={data?.clicks[link.id] ?? 0}
                    onUpdate={updateLink}
                    onRemove={removeLink}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </main>
    </div>
  );
}
