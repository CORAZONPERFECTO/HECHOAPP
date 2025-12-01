"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonnelList } from "@/components/resources/personnel-list";
import { PersonnelDetail } from "@/components/resources/personnel-detail";
import { ErrorDatabaseList } from "@/components/resources/error-database-list";
import { ErrorDetail } from "@/components/resources/error-detail";
import { CompanyProfile } from "@/components/resources/company-profile";
import { PersonnelResource, ACError, UserRole } from "@/types/schema";
import { Users, AlertTriangle, Building2, Loader2 } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ResourcesPage() {
    const [activeTab, setActiveTab] = useState("personnel");
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Personnel View State
    const [personnelView, setPersonnelView] = useState<'list' | 'detail'>('list');
    const [selectedPerson, setSelectedPerson] = useState<PersonnelResource | null>(null);

    // Error View State
    const [errorView, setErrorView] = useState<'list' | 'detail'>('list');
    const [selectedError, setSelectedError] = useState<ACError | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Super Admin Override
                if (user.email?.toLowerCase() === 'lcaa27@gmail.com') {
                    setCurrentUserRole('ADMIN');
                } else {
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        const role = userDoc.data().role as UserRole;
                        setCurrentUserRole(role);

                        // If user is Technician, default to errors tab
                        if (role === 'TECNICO') {
                            setActiveTab("errors");
                        }
                    }
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Handlers for Personnel
    const handleSelectPerson = (person: PersonnelResource) => {
        setSelectedPerson(person);
        setPersonnelView('detail');
    };

    const handleNewPerson = () => {
        setSelectedPerson(null);
        setPersonnelView('detail');
    };

    const handleBackPersonnel = () => {
        setPersonnelView('list');
        setSelectedPerson(null);
    };

    // Handlers for Errors
    const handleSelectError = (error: ACError) => {
        setSelectedError(error);
        setErrorView('detail');
    };

    const handleNewError = () => {
        setSelectedError(null);
        setErrorView('detail');
    };

    const handleBackError = () => {
        setErrorView('list');
        setSelectedError(null);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    }

    const canViewPersonnel = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE';
    const canViewCompany = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR' || currentUserRole === 'GERENTE';

    return (
        <div className="container mx-auto py-8 px-4">
            <h1 className="text-3xl font-bold mb-6 text-gray-900">Módulo de Recursos</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-3">
                    {canViewPersonnel ? (
                        <TabsTrigger value="personnel" className="gap-2">
                            <Users className="h-4 w-4" /> Personal
                        </TabsTrigger>
                    ) : (
                        <div className="flex items-center justify-center text-gray-400 text-sm gap-2 cursor-not-allowed opacity-50">
                            <Users className="h-4 w-4" /> Personal
                        </div>
                    )}
                    <TabsTrigger value="errors" className="gap-2">
                        <AlertTriangle className="h-4 w-4" /> Errores
                    </TabsTrigger>
                    {canViewCompany && (
                        <TabsTrigger value="company" className="gap-2">
                            <Building2 className="h-4 w-4" /> Empresa
                        </TabsTrigger>
                    )}
                </TabsList>

                {canViewPersonnel && (
                    <TabsContent value="personnel" className="outline-none">
                        {personnelView === 'list' ? (
                            <PersonnelList onSelect={handleSelectPerson} onNew={handleNewPerson} />
                        ) : (
                            <PersonnelDetail
                                person={selectedPerson}
                                onBack={handleBackPersonnel}
                                onSave={handleBackPersonnel}
                            />
                        )}
                    </TabsContent>
                )}

                <TabsContent value="errors" className="outline-none">
                    {errorView === 'list' ? (
                        <ErrorDatabaseList
                            onSelect={handleSelectError}
                            onNew={handleNewError}
                            currentUserRole={currentUserRole}
                        />
                    ) : (
                        <ErrorDetail
                            error={selectedError}
                            onBack={handleBackError}
                            onSave={handleBackError}
                        />
                    )}
                </TabsContent>

                {canViewCompany && (
                    <TabsContent value="company" className="outline-none">
                        <CompanyProfile />
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}
