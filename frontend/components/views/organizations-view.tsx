"use client";

import { useState } from "react";
import { Building, Plus, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Organization } from "@/types";

interface OrganizationsViewProps {
    organizations: Organization[];
    isLoading: boolean;
    onCreateOrganization: (data: { name: string; slug: string }) => void;
    isCreating: boolean;
}

export function OrganizationsView({ organizations, isLoading, onCreateOrganization, isCreating }: OrganizationsViewProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", slug: "" });

    const glass = "rounded-xl text-card-foreground backdrop-saturate-150 border border-foreground/5 backdrop-blur-xl bg-gradient-to-br from-card/20 to-card/5 dark:from-card/20 dark:to-background/5 shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.6)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]";

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreateOrganization(formData);
        setIsOpen(false);
        setFormData({ name: "", slug: "" });
    };

    return (
        <div className="w-full px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6 bg-background">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col">
                    <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Administration</span>
                    <h1 className="font-heading text-3xl text-foreground tracking-tight mt-1 font-bold">Organizations</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage institutional workspaces and team access perimeters.</p>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger render={<Button className="bg-primary text-primary-foreground w-full md:w-auto"/>}>
                        <Plus className="w-4 h-4 mr-2" /> Add Organization
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create Organization</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Organization Name</Label>
                                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Veritas Capital" required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="slug">Workspace Slug</Label>
                                <Input id="slug" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})} placeholder="e.g. veritas-capital" required />
                            </div>
                            <Button type="submit" disabled={isCreating} className="mt-2">
                                {isCreating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                Create Workspace
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading organizations...
                </div>
            ) : organizations.length === 0 ? (
                <div className={glass}>
                    <div className="p-12 text-center text-muted-foreground">
                        No organizations configured. Create one to get started.
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {organizations.map((org) => (
                        <div key={org.id} className={`hover:border-primary/50 transition-colors ${glass}`}>
                            <div className="p-6 pb-3 flex flex-row items-center justify-between">
                                <h3 className="font-semibold leading-none tracking-tight text-lg font-bold flex items-center gap-2">
                                    <Building className="w-5 h-5 text-primary" />
                                    {org.name}
                                </h3>
                                <Users className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="p-6 pt-0">
                                <div className="flex flex-col gap-1">
                                    <span className="font-mono text-xs text-muted-foreground bg-muted w-fit px-2 py-1 rounded">/{org.slug}</span>
                                    <span className="text-xs text-muted-foreground mt-2">ID: {org.id}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}