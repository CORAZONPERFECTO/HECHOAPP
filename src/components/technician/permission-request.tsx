"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface PermissionRequestProps {
    onPermissionsGranted: () => void;
}

type PermissionStatus = 'pending' | 'granted' | 'denied' | 'checking';

export function PermissionRequest({ onPermissionsGranted }: PermissionRequestProps) {
    const [locationStatus, setLocationStatus] = useState<PermissionStatus>('pending');
    const [cameraStatus, setCameraStatus] = useState<PermissionStatus>('pending');
    const [isRequesting, setIsRequesting] = useState(false);

    useEffect(() => {
        // Check if permissions were previously granted
        const permissionsGranted = localStorage.getItem('technicianPermissionsGranted');
        if (permissionsGranted === 'true') {
            checkExistingPermissions();
        }
    }, []);

    const checkExistingPermissions = async () => {
        setLocationStatus('checking');
        setCameraStatus('checking');

        // Check location permission
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setLocationStatus('granted');
                    checkCameraPermission();
                },
                () => {
                    setLocationStatus('pending');
                    setCameraStatus('pending');
                }
            );
        } else {
            setLocationStatus('denied');
            setCameraStatus('pending');
        }
    };

    const checkCameraPermission = async () => {
        try {
            // Try to access camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately
            setCameraStatus('granted');

            // Both granted, proceed
            localStorage.setItem('technicianPermissionsGranted', 'true');
            onPermissionsGranted();
        } catch (error) {
            setCameraStatus('pending');
        }
    };

    const requestPermissions = async () => {
        setIsRequesting(true);

        // Request Location
        if (navigator.geolocation) {
            setLocationStatus('checking');
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log('✅ Location granted:', position.coords);
                    setLocationStatus('granted');
                    requestCameraPermission();
                },
                (error) => {
                    console.error('❌ Location denied:', error);
                    setLocationStatus('denied');
                    setIsRequesting(false);
                    alert('⚠️ Permiso de ubicación denegado. Las fotos no tendrán coordenadas GPS.');
                    // Continue anyway
                    requestCameraPermission();
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            setLocationStatus('denied');
            alert('⚠️ Tu dispositivo no soporta geolocalización.');
            requestCameraPermission();
        }
    };

    const requestCameraPermission = async () => {
        setCameraStatus('checking');
        try {
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            // Stop the stream immediately
            stream.getTracks().forEach(track => track.stop());

            console.log('✅ Camera granted');
            setCameraStatus('granted');

            // Save permission state
            localStorage.setItem('technicianPermissionsGranted', 'true');

            setIsRequesting(false);

            // Small delay for user to see success
            setTimeout(() => {
                onPermissionsGranted();
            }, 1000);
        } catch (error) {
            console.error('❌ Camera denied:', error);
            setCameraStatus('denied');
            setIsRequesting(false);
            alert('⚠️ Permiso de cámara denegado. No podrás tomar fotos.');
        }
    };

    const getStatusIcon = (status: PermissionStatus) => {
        switch (status) {
            case 'granted':
                return <CheckCircle2 className="h-5 w-5 text-green-600" />;
            case 'denied':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'checking':
                return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
            default:
                return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
        }
    };

    const allGranted = locationStatus === 'granted' && cameraStatus === 'granted';

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                        Permisos Necesarios
                    </CardTitle>
                    <CardDescription className="text-base mt-2">
                        Para documentar el servicio correctamente, necesitamos acceso a:
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Location Permission */}
                    <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <MapPin className="h-6 w-6 text-blue-600 mt-1 shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Ubicación GPS</h3>
                            <p className="text-sm text-gray-600">
                                Para agregar coordenadas y dirección a las fotos de evidencia
                            </p>
                        </div>
                        {getStatusIcon(locationStatus)}
                    </div>

                    {/* Camera Permission */}
                    <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Camera className="h-6 w-6 text-purple-600 mt-1 shrink-0" />
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-1">Cámara</h3>
                            <p className="text-sm text-gray-600">
                                Para tomar fotos antes, durante y después del servicio
                            </p>
                        </div>
                        {getStatusIcon(cameraStatus)}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                        {allGranted ? (
                            <div className="text-center">
                                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                                <p className="text-green-700 font-medium">¡Permisos concedidos!</p>
                                <p className="text-sm text-gray-600 mt-1">Redirigiendo...</p>
                            </div>
                        ) : (
                            <Button
                                onClick={requestPermissions}
                                disabled={isRequesting}
                                className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            >
                                {isRequesting ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Solicitando permisos...
                                    </>
                                ) : (
                                    'Permitir Acceso'
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Info Note */}
                    <div className="text-xs text-gray-500 text-center pt-2 border-t">
                        💡 Estos permisos solo se solicitan una vez. Puedes cambiarlos después en la configuración de tu navegador.
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
