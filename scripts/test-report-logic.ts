
import { generateReportFromTicket, updatePhotosFromTicket } from '../src/lib/report-generator';
import { Ticket, TicketReportNew, GallerySection, PhotoSection } from '../src/types/schema';
import { Timestamp } from 'firebase/firestore';

// Mock Ticket Data
const mockTicket: Ticket = {
    id: 'TICKET-TEST-001',
    clientName: 'Test Client',
    description: 'Test Description',
    diagnosis: 'Test Diagnosis',
    solution: 'Test Solution',
    recommendations: 'Test Recommendations',
    priority: 'MEDIUM',
    status: 'COMPLETED',
    serviceType: 'MANTENIMIENTO',
    locationName: 'Test Location',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp,
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as Timestamp,
    checklist: [],
    photos: [
        {
            url: 'https://example.com/photo1.jpg',
            type: 'BEFORE',
            description: 'Photo 1 Description',
            location: 'Area 1'
        },
        {
            url: 'https://example.com/photo2.jpg',
            type: 'AFTER',
            description: 'Photo 2 Description',
            location: 'Area 1'
        }
    ]
};

console.log('--- STARTING REPORT CYCLE TEST ---');

// 1. Generate Initial Report
console.log('1. Generating Initial Report...');
const report = generateReportFromTicket(mockTicket);

// Verify Initial Photos
const gallerySections = report.sections.filter(s => s.type === 'gallery') as GallerySection[];
console.log(`   Found ${gallerySections.length} gallery sections.`);
gallerySections.forEach((g, i) => {
    console.log(`   Gallery ${i + 1}: ${g.photos.length} photos.`);
});

if (gallerySections.length > 0 && gallerySections[0].photos.length === 2) {
    console.log('   ✅ Initial Generation Success: 2 photos found in gallery.');
} else {
    console.error('   ❌ Initial Generation Failed: Expected 2 photos in gallery.');
}

// 2. Mock Adding New Photo to Ticket
console.log('\n2. Adding New Photo to Ticket...');
const updatedTicket = {
    ...mockTicket,
    photos: [
        ...mockTicket.photos,
        {
            url: 'https://example.com/photo3_NEW.jpg',
            type: 'DURING',
            description: 'New Photo Description',
            location: 'Area 2'
        }
    ]
};

// 3. Update Report
console.log('3. Updating Report with New Photo...');
// @ts-ignore
const updatedReport = updatePhotosFromTicket(report, updatedTicket);

// Verify Update
const updatedGalleries = updatedReport.sections.filter(s => s.type === 'gallery') as GallerySection[];
let totalPhotos = 0;
updatedGalleries.forEach(g => totalPhotos += g.photos.length);

console.log(`   Updated Report has ${updatedGalleries.length} gallery sections.`);
console.log(`   Total Photos in Galleries: ${totalPhotos}`);

// Check if new photo exists
const hasNewPhoto = updatedGalleries.some(g => g.photos.some(p => p.photoUrl === 'https://example.com/photo3_NEW.jpg'));

if (hasNewPhoto) {
    console.log('   ✅ Update Success: New photo found in report.');
} else {
    console.error('   ❌ Update Failed: New photo NOT found.');
}

console.log('\n--- TEST COMPLETE ---');
