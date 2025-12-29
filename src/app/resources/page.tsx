"use client";

import { ErrorUploadForm } from "@/components/resources/error-upload-form";
import { ErrorValidationPanel } from "@/components/resources/error-validation-panel";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { UserRole, PersonnelResource, ACError } from "@/types/schema";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Users, AlertTriangle, Building2, BookOpen } from "lucide-react";
import { PersonnelList } from "@/components/resources/personnel-list";
import { PersonnelDetail } from "@/components/resources/personnel-detail";
import { ErrorDatabaseList } from "@/components/resources/error-database-list";
import { ErrorDetail } from "@/components/resources/error-detail";
import { CompanyProfile } from "@/components/resources/company-profile";
import { UserManualViewer } from "@/components/resources/user-manual-viewer";

function ResourcesContent() {
    const searchParams = useSearchParams();

    // Initialize tab from URL or default to personnel
    const [activeTab, setActiveTab] = useState("personnel");
    const [currentUserRole, setCurrentUserRole] = useState<UserRole | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    // Personnel View State
    const [personnelView, setPersonnelView] = useState<'list' | 'detail'>('list');
    const [selectedPerson, setSelectedPerson] = useState<PersonnelResource | null>(null);

    // Error View State
    const [errorView, setErrorView] = useState<'list' | 'detail' | 'upload' | 'validation'>('list');
    const [selectedError, setSelectedError] = useState<ACError | null>(null);
    const [validationData, setValidationData] = useState<{ data: any[], brand: string, model: string, photos: File[] } | null>(null);

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam && ['personnel', 'errors', 'company'].includes(tabParam)) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

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

                        // If user is Technician, default to errors tab ONLY if no URL param overrides it
                        const tabParam = searchParams.get("tab");
                        if (role === 'TECNICO' && !tabParam) {
                            setActiveTab("errors");
                        }
                    }
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [searchParams]);

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
        setValidationData(null);
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
                <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
                    <TabsTrigger value="manual" className="gap-2">
                        <BookOpen className="h-4 w-4" /> Manual
                    </TabsTrigger>
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
                            onNew={() => setErrorView('upload')}
                            currentUserRole={currentUserRole}
                        />
                    ) : errorView === 'upload' ? (
                        <ErrorUploadForm
                            onCancel={() => setErrorView('list')}
                            onProcessingComplete={(data, brand, model, photos) => {
                                setValidationData({ data, brand, model, photos });
                                setErrorView('validation');
                            }}
                        />
                    ) : errorView === 'validation' && validationData ? (
                        <ErrorValidationPanel
                            data={validationData.data}
                            brand={validationData.brand}
                            model={validationData.model}
                            photos={validationData.photos}
                            onComplete={() => {
                                setValidationData(null);
                                setErrorView('list');
                            }}
                            onCancel={() => {
                                if (confirm("¿Estás seguro de cancelar? Se perderán los datos extraídos.")) {
                                    setValidationData(null);
                                    setErrorView('list');
                                }
                            }}
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

                <TabsContent value="manual" className="outline-none">
                    <UserManualViewer />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function ResourcesPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>}>
            <ResourcesContent />
        </Suspense>
    );
}
