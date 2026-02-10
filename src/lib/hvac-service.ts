import { db, storage } from "@/lib/firebase";
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp,
    limit,
    startAfter,
    QueryDocumentSnapshot
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    HVACAsset,
    Intervention,
    LocationNode,
    HierarchyType
} from "@/types/hvac";

// COLLECTIONS
const COLL_LOCATIONS = "locations_v2"; // Using v2 to distinguish from old locations if needed, or migration strategy
const COLL_ASSETS = "equipment"; // Re-using existing but with new fields
const COLL_INTERVENTIONS = "interventions";
const STORAGE_PATH = "hvac_evidence";

export async function uploadInterventionPhoto(file: Blob, interventionId: string): Promise<string> {
    const filename = `${interventionId}_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const storageRef = ref(storage, `${STORAGE_PATH}/${filename}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
}

// --- HIERARCHY / LOCATIONS ---

export async function getLocationNode(id: string): Promise<LocationNode | null> {
    const snap = await getDoc(doc(db, COLL_LOCATIONS, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as LocationNode) : null;
}

export async function getLocationChildren(parentId: string | null, clientId: string): Promise<LocationNode[]> {
    try {
        let q;
        if (parentId) {
            // Get children of a specific node
            q = query(
                collection(db, COLL_LOCATIONS),
                where("parentId", "==", parentId),
                where("clientId", "==", clientId),
                orderBy("name")
            );
        } else {
            // Get Root nodes (e.g. Projects) for this client
            q = query(
                collection(db, COLL_LOCATIONS),
                where("parentId", "==", null),
                where("clientId", "==", clientId),
                orderBy("name")
            );
        }

        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }) as LocationNode);
    } catch (error) {
        console.error("Error fetching location children:", error);
        return [];
    }
}

// --- ASSETS ---

export async function getAssetsByLocation(locationId: string): Promise<HVACAsset[]> {
    // Get assets directly in this location (Area)
    const q = query(
        collection(db, COLL_ASSETS),
        where("locationId", "==", locationId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }) as HVACAsset);
}

export async function getAssetByQr(qrCode: string): Promise<HVACAsset | null> {
    const q = query(collection(db, COLL_ASSETS), where("qrCode", "==", qrCode), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as HVACAsset;
}

export async function createAsset(data: { name: string, clientId: string, locationId: string, villaId: string, qrCode: string, status: string, brand: string, model: string, serialNumber: string, type: string, btu?: number, voltage?: string, refrigerant?: string }): Promise<string> {
    const finalData = {
        name: data.name,
        clientId: data.clientId,
        locationId: data.locationId,
        villaId: data.villaId,
        qrCode: data.qrCode,
        status: data.status,
        specs: {
            brand: data.brand,
            model: data.model,
            serialNumber: data.serialNumber,
            type: data.type,
            btu: data.btu || null,
            voltage: data.voltage || null,
            refrigerant: data.refrigerant || null
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    const ref = await addDoc(collection(db, COLL_ASSETS), finalData);
    return ref.id;
}

// --- INTERVENTIONS (RIT) ---

export async function createIntervention(data: Partial<Intervention>): Promise<string> {
    // Enforce server timestamps for immutability logic
    const finalData = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: data.status || 'DRAFT'
    };

    const ref = await addDoc(collection(db, COLL_INTERVENTIONS), finalData);
    return ref.id;
}

export async function getAssetHistory(assetId: string, lastDoc?: any): Promise<{ items: Intervention[], lastDoc: any }> {
    let q = query(
        collection(db, COLL_INTERVENTIONS),
        where("assetId", "==", assetId),
        orderBy("createdAt", "desc"),
        limit(10)
    );

    if (lastDoc) {
        q = query(q, startAfter(lastDoc));
    }

    const snap = await getDocs(q);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Intervention);
    return {
        items,
        lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
    };
}

export async function getInterventionById(id: string): Promise<Intervention | null> {
    const snap = await getDoc(doc(db, COLL_INTERVENTIONS, id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Intervention) : null;
}

export async function addInterventionComment(interventionId: string, text: string, user: { uid: string, displayName: string, role: string }) {
    // Depending on architecture, could be array update or subcollection.
    // Design doc mentioned subcollection for scalability or array for simplicity.
    // Let's use arrayUnion on the main doc for now to keep it simple for PDF generation, 
    // unless it hits limits. For conversation streams, subcollection is safer.
    // Going with Subcollection as per Design Doc 3.3 preference for "Conversation Stream".

    const commentData = {
        text,
        authorId: user.uid,
        authorName: user.displayName || 'Usuario',
        authorRole: user.role === 'CLIENTE' ? 'CLIENTE' : 'HECHO',
        createdAt: serverTimestamp()
    };

    await addDoc(collection(db, COLL_INTERVENTIONS, interventionId, "comments"), commentData);
}

export async function getInterventionComments(interventionId: string) {
    const q = query(
        collection(db, COLL_INTERVENTIONS, interventionId, "comments"),
        orderBy("createdAt", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getApprovalsByAsset(assetId: string) {
    const q = query(
        collection(db, "approvalRequests"),
        where("assetId", "==", assetId),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
