import { StyleSheet, Font } from '@react-pdf/renderer';

// Register standard fonts if needed, or rely on defaults (Helvetica is built-in)
// Font.register({ family: 'Roboto', src: 'https://...' });

export const themes = {
    classic: {
        fontMain: 'Helvetica',
        fontBold: 'Helvetica-Bold',
        primaryColor: '#1a1a1a', // Black/Dark Grey
        secondaryColor: '#ffffff',
        accentColor: '#3b82f6', // Blue-500 equivalent usually, but classic is sober.
        fontSize: {
            result: 10,
            header: 20,
            title: 12,
            body: 10,
            small: 8
        }
    },
    modern: {
        fontMain: 'Helvetica',
        fontBold: 'Helvetica-Bold',
        primaryColor: '#2563eb', // Blue-600
        secondaryColor: '#f3f4f6', // Gray-100
        accentColor: '#1e40af', // Blue-800
        fontSize: {
            result: 12,
            header: 24,
            title: 14,
            body: 10,
            small: 9
        }
    },
    simple: {
        fontMain: 'Helvetica', // Courier could be an option for "Simple" but Helvetica is cleaner
        fontBold: 'Helvetica-Bold',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
        accentColor: '#000000',
        fontSize: {
            result: 10,
            header: 18,
            title: 12,
            body: 11, // Slightly larger for readability
            small: 9
        }
    }
};
